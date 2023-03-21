// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";
import {IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import {IERC721Wrapper} from "../interfaces/IERC721Wrapper.sol";
import {IWrapperValidator} from "../interfaces/IWrapperValidator.sol";
import {IFlashLoanReceiver} from "../interfaces/IFlashLoanReceiver.sol";
import {IMoonbirds} from "./IMoonbirds.sol";
import {IDelegationRegistry} from "../interfaces/IDelegationRegistry.sol";

contract MoonbirdsWrapper is
    IERC721Wrapper,
    IERC721ReceiverUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    ERC721EnumerableUpgradeable
{
    IERC721MetadataUpgradeable public override underlyingToken;
    IWrapperValidator public override validator;
    address private _currentFlashLoanReceiver;
    address private _currentFlashLoanMsgSender;
    bool public override isFlashLoanEnabled;
    bool public override isMintEnabled;
    address public override delegateCashContract;
    // Mapping from token to delegate cash
    mapping(uint256 => bool) private _hasDelegateCashes;
    bool public override isOwnershipDelegateEnabled;

    modifier whenFlashLoanEnabled() {
        require(isFlashLoanEnabled, "MoonbirdsWrapper: flash loan disabled");
        _;
    }

    modifier whenOwnershipDelegateEnabled() {
        require(isOwnershipDelegateEnabled, "MoonbirdsWrapper: ownership delegate disabled");
        _;
    }

    function initialize(
        IERC721MetadataUpgradeable underlyingToken_,
        IWrapperValidator validator_,
        string memory name,
        string memory symbol
    ) public initializer {
        __Pausable_init();
        __ReentrancyGuard_init();
        __Ownable_init();
        __ERC721_init(name, symbol);

        require(
            validator_.underlyingToken() == address(underlyingToken_),
            "MoonbirdsWrapper: underlying token mismatch"
        );
        underlyingToken = underlyingToken_;
        validator = validator_;
        isMintEnabled = true;
        isOwnershipDelegateEnabled = true;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721EnumerableUpgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return interfaceId == type(IERC721Wrapper).interfaceId || super.supportsInterface(interfaceId);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory
    ) public virtual override returns (bytes4) {
        require(_msgSender() == address(underlyingToken), "MoonbirdsWrapper: not acceptable erc721");

        require(validator.isValid(address(underlyingToken), tokenId), "MoonbirdsWrapper: invalid token id");
        require(address(this) == underlyingToken.ownerOf(tokenId), "MoonbirdsWrapper: invalid token owner");

        // special check for flash loan receiver return back bird
        if (_exists(tokenId)) {
            require(_currentFlashLoanReceiver == from, "MoonbirdsWrapper: from not flash loan receiver");
            require(operator == from, "MoonbirdsWrapper: operator not same with from");
            require(
                ownerOf(tokenId) == _currentFlashLoanMsgSender,
                "MoonbirdsWrapper: token owner not flash loan sender"
            );
        } else {
            require(isMintEnabled, "MoonbirdsWrapper: mint disabled");

            _mint(from, tokenId);
        }

        return IERC721ReceiverUpgradeable.onERC721Received.selector;
    }

    function updateValidator(address validator_) external override onlyOwner {
        require(
            IWrapperValidator(validator_).underlyingToken() == address(underlyingToken),
            "MoonbirdsWrapper: underlying token mismatch"
        );
        address preValidator = address(validator);
        validator = IWrapperValidator(validator_);
        emit ValidatorUpdated(preValidator, address(validator));
    }

    function mint(uint256 tokenId) external override nonReentrant whenNotPaused {
        tokenId;
        require(false, "MoonbirdsWrapper: mint not supported");
    }

    function burn(uint256 tokenId) external override nonReentrant whenNotPaused {
        require(_msgSender() == ownerOf(tokenId), "MoonbirdsWrapper: only owner can burn");

        require(address(this) == underlyingToken.ownerOf(tokenId), "MoonbirdsWrapper: invalid token owner");

        _removeDelegateCashForToken(_msgSender(), tokenId);

        _burn(tokenId);

        IMoonbirds(address(underlyingToken)).safeTransferWhileNesting(address(this), _msgSender(), tokenId);
    }

    function setFlashLoanEnabled(bool value) public onlyOwner {
        isFlashLoanEnabled = value;

        emit FlashLoanEnabled(value);
    }

    function setMintEnabled(bool value) public onlyOwner {
        isMintEnabled = value;

        emit MintEnabled(value);
    }

    function flashLoan(
        address receiverAddress,
        uint256[] calldata tokenIds,
        bytes calldata params
    ) external override nonReentrant whenNotPaused whenFlashLoanEnabled {
        uint256 i;
        IFlashLoanReceiver receiver = IFlashLoanReceiver(receiverAddress);

        // !!!CAUTION: receiver contract may reentry mint, burn, flashloan again

        require(receiverAddress != address(0), "MoonbirdsWrapper: can't be zero address");
        require(tokenIds.length > 0, "MoonbirdsWrapper: empty tokenIds");

        // only token owner can do flashloan
        for (i = 0; i < tokenIds.length; i++) {
            require(ownerOf(tokenIds[i]) == _msgSender(), "MoonbirdsWrapper: caller is not owner");
        }

        // step 1: moving underlying asset forward to receiver contract
        for (i = 0; i < tokenIds.length; i++) {
            IMoonbirds(address(underlyingToken)).safeTransferWhileNesting(address(this), receiverAddress, tokenIds[i]);
        }

        // setup 2: execute receiver contract, doing something like aidrop
        _currentFlashLoanMsgSender = _msgSender();
        _currentFlashLoanReceiver = receiverAddress;
        require(
            receiver.executeOperation(address(underlyingToken), tokenIds, _msgSender(), address(this), params),
            "MoonbirdsWrapper: flashloan failed"
        );
        _currentFlashLoanReceiver = address(0);
        _currentFlashLoanMsgSender = address(0);

        // setup 3: moving underlying asset backword from receiver contract
        for (i = 0; i < tokenIds.length; i++) {
            require(
                underlyingToken.ownerOf(tokenIds[i]) == address(this),
                "MoonbirdsWrapper: receiver did not return token"
            );

            emit FlashLoan(receiverAddress, _msgSender(), address(underlyingToken), tokenIds[i]);
        }
    }

    function setPause(bool flag) public onlyOwner {
        if (flag) {
            _pause();
        } else {
            _unpause();
        }
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(IERC721MetadataUpgradeable, ERC721Upgradeable)
        returns (string memory)
    {
        return underlyingToken.tokenURI(tokenId);
    }

    function setOwnershipDelegateEnabled(bool value) public onlyOwner {
        isOwnershipDelegateEnabled = value;

        emit OwnershipDelegateEnabled(value);
    }

    function setDelegateCashContract(address newDelegateCash) public virtual onlyOwner {
        require(newDelegateCash != address(0), "MoonbirdsWrapper: new contract is the zero address");
        address oldDelegateCash = delegateCashContract;
        delegateCashContract = newDelegateCash;
        emit DelegateCashUpdated(oldDelegateCash, newDelegateCash);
    }

    function hasDelegateCashForToken(uint256 tokenId) public view override returns (bool) {
        return _hasDelegateCashes[tokenId];
    }

    function setDelegateCashForToken(uint256[] calldata tokenIds, bool value)
        public
        override
        nonReentrant
        whenOwnershipDelegateEnabled
    {
        IDelegationRegistry delegateContract = IDelegationRegistry(delegateCashContract);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            address tokenOwner = ERC721Upgradeable.ownerOf(tokenIds[i]);
            require(tokenOwner == _msgSender(), "MoonbirdsWrapper: caller is not owner");

            delegateContract.delegateForToken(tokenOwner, address(underlyingToken), tokenIds[i], value);

            _hasDelegateCashes[tokenIds[i]] = value;

            emit DelegateCashForTokenUpdated(tokenIds[i], value);
        }
    }

    function _removeDelegateCashForToken(address tokenOwner, uint256 tokenId) internal {
        if (_hasDelegateCashes[tokenId]) {
            IDelegationRegistry delegateContract = IDelegationRegistry(delegateCashContract);

            delegateContract.delegateForToken(tokenOwner, address(underlyingToken), tokenId, false);
            _hasDelegateCashes[tokenId] = false;

            emit DelegateCashForTokenUpdated(tokenId, false);
        }
    }
}
