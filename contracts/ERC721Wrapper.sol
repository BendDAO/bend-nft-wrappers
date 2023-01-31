// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {IERC721Wrapper} from "./interfaces/IERC721Wrapper.sol";
import {IWrapperValidator} from "./interfaces/IWrapperValidator.sol";
import {IFlashLoanReceiver} from "./interfaces/IFlashLoanReceiver.sol";

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";
import {IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract ERC721Wrapper is
    IERC721Wrapper,
    IERC721ReceiverUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC721Upgradeable
{
    IERC721MetadataUpgradeable public override underlyingToken;
    IWrapperValidator public override validator;

    function initialize(
        IERC721MetadataUpgradeable underlyingToken_,
        IWrapperValidator validator_,
        string memory name,
        string memory symbol
    ) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init();
        __ERC721_init(name, symbol);

        require(validator_.underlyingToken() == address(underlyingToken_), "Validator: underlying token mismatch");
        underlyingToken = underlyingToken_;
        validator = validator_;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Upgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return interfaceId == type(IERC721Wrapper).interfaceId || super.supportsInterface(interfaceId);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        require(_msgSender() == address(underlyingToken), "ERC721Wrapper: not acceptable erc721");
        return IERC721ReceiverUpgradeable.onERC721Received.selector;
    }

    function updateValidator(address validator_) external override onlyOwner {
        require(
            IWrapperValidator(validator_).underlyingToken() == address(underlyingToken),
            "Validator: underlying token mismatch"
        );
        address preValidator = address(validator);
        validator = IWrapperValidator(validator_);
        emit ValidatorUpdated(preValidator, address(validator));
    }

    function mint(uint256 tokenId) external override nonReentrant {
        address owner = underlyingToken.ownerOf(tokenId);
        require(_msgSender() == owner, "ERC721Wrapper: only owner can mint");
        require(validator.isValid(address(underlyingToken), tokenId), "ERC721Wrapper: token id not valid");

        underlyingToken.safeTransferFrom(_msgSender(), address(this), tokenId);
        _mint(_msgSender(), tokenId);
    }

    function burn(uint256 tokenId) external override nonReentrant {
        require(_msgSender() == ownerOf(tokenId), "ERC721Wrapper: only owner can burn");
        address owner = underlyingToken.ownerOf(tokenId);
        require(address(this) == owner, "ERC721Wrapper: invalid tokenId");

        underlyingToken.safeTransferFrom(address(this), _msgSender(), tokenId);
        _burn(tokenId);
    }

    function flashLoan(
        address receiverAddress,
        uint256[] calldata tokenIds,
        bytes calldata params
    ) external override nonReentrant {
        uint256 i;
        IFlashLoanReceiver receiver = IFlashLoanReceiver(receiverAddress);

        // !!!CAUTION: receiver contract may reentry mint, burn, flashloan again

        require(receiverAddress != address(0), "ERC721Wrapper: can't be zero address");
        require(tokenIds.length > 0, "ERC721Wrapper: empty tokenIds");

        // only token owner can do flashloan
        for (i = 0; i < tokenIds.length; i++) {
            require(ownerOf(tokenIds[i]) == _msgSender(), "ERC721Wrapper: caller is not owner");
        }

        // step 1: moving underlying asset forward to receiver contract
        for (i = 0; i < tokenIds.length; i++) {
            underlyingToken.safeTransferFrom(address(this), receiverAddress, tokenIds[i]);
        }

        // setup 2: execute receiver contract, doing something like aidrop
        require(
            receiver.executeOperation(address(underlyingToken), tokenIds, _msgSender(), address(this), params),
            "ERC721Wrapper: flashloan failed"
        );

        // setup 3: moving underlying asset backword from receiver contract
        for (i = 0; i < tokenIds.length; i++) {
            underlyingToken.safeTransferFrom(receiverAddress, address(this), tokenIds[i]);

            emit FlashLoan(receiverAddress, _msgSender(), address(underlyingToken), tokenIds[i]);
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
}
