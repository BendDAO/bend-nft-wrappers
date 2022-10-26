// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import {IERC721Wrapper} from "../interfaces/IERC721Wrapper.sol";
import {IWrapperValidator} from "../interfaces/IWrapperValidator.sol";
import {IFlashLoanReceiver} from "../interfaces/IFlashLoanReceiver.sol";
import {IMoonbirds} from "./IMoonbirds.sol";
import {MoonbirdsUserProxy} from "./MoonbirdsUserProxy.sol";

contract MoonbirdsWrapper is IERC721Wrapper, IERC721Receiver, Ownable, ReentrancyGuard, ERC721 {
    using Clones for address;

    event MoonbirdsUserProxyRegistered(address user, address proxy);

    IERC721Metadata public immutable override underlyingToken;
    IWrapperValidator public override validator;
    IMoonbirds public immutable moonbirds;
    address public immutable userProxyImplemention;
    // Mapping from user address to proxy address
    mapping(address => address) private _userProxies;

    constructor(
        IERC721Metadata underlyingToken_,
        IWrapperValidator validator_,
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {
        require(validator_.underlyingToken() == underlyingToken_, "MoonbirdsWrapper: underlying token mismatch");
        underlyingToken = underlyingToken_;
        validator = validator_;
        moonbirds = IMoonbirds(address(underlyingToken_));
        userProxyImplemention = address(new MoonbirdsUserProxy());
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, IERC165) returns (bool) {
        return interfaceId == type(IERC721Wrapper).interfaceId || super.supportsInterface(interfaceId);
    }

    function onERC721Received(
        address,
        address,
        uint256 tokenId,
        bytes memory
    ) public virtual override returns (bytes4) {
        require(_msgSender() == address(underlyingToken), "MoonbirdsWrapper: not acceptable erc721");
        (bool nesting, , ) = moonbirds.nestingPeriod(tokenId);
        require(nesting, "MoonbirdsWrapper: only support birds in nesting");
        return IERC721Receiver.onERC721Received.selector;
    }

    function updateValidator(address validator_) external override onlyOwner {
        require(
            IWrapperValidator(validator_).underlyingToken() == underlyingToken,
            "MoonbirdsWrapper: underlying token mismatch"
        );
        address preValidator = address(validator);
        validator = IWrapperValidator(validator_);
        emit ValidatorUpdated(preValidator, address(validator));
    }

    function mint(uint256 tokenId) external override nonReentrant {
        require(validator.isValid(address(underlyingToken), tokenId), "MoonbirdsWrapper: token id not valid");

        MoonbirdsUserProxy proxy = MoonbirdsUserProxy(_userProxies[_msgSender()]);
        proxy.transfer(tokenId);
        require(address(this) == underlyingToken.ownerOf(tokenId), "MoonbirdsWrapper: proxy transfer failed");

        _mint(_msgSender(), tokenId);
    }

    function burn(uint256 tokenId) external override nonReentrant {
        require(_msgSender() == ownerOf(tokenId), "MoonbirdsWrapper: only owner can burn");

        require(address(this) == underlyingToken.ownerOf(tokenId), "MoonbirdsWrapper: invalid token owner");

        _burn(tokenId);

        moonbirds.safeTransferWhileNesting(address(this), _msgSender(), tokenId);
    }

    function flashLoan(
        address receiverAddress,
        uint256[] calldata tokenIds,
        bytes calldata params
    ) external override nonReentrant {
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
            moonbirds.safeTransferWhileNesting(address(this), receiverAddress, tokenIds[i]);
        }

        // setup 2: execute receiver contract, doing something like aidrop
        require(
            receiver.executeOperation(address(underlyingToken), tokenIds, _msgSender(), address(this), params),
            "MoonbirdsWrapper: flashloan failed"
        );

        // setup 3: moving underlying asset backword from receiver contract
        for (i = 0; i < tokenIds.length; i++) {
            require(
                underlyingToken.ownerOf(tokenIds[i]) == address(this),
                "MoonbirdsWrapper: receiver did not return token"
            );

            emit FlashLoan(receiverAddress, _msgSender(), address(underlyingToken), tokenIds[i]);
        }
    }

    function tokenURI(uint256 tokenId) public view override(IERC721Metadata, ERC721) returns (string memory) {
        return underlyingToken.tokenURI(tokenId);
    }

    /**
     * @dev Registers user proxy
     */
    function registerUserProxy() public {
        address sender = _msgSender();

        require(_userProxies[sender] == address(0), "MoonbirdsWrapper: caller has registered the proxy");

        address proxy = userProxyImplemention.clone();
        MoonbirdsUserProxy(proxy).initialize(address(this), address(moonbirds));

        _userProxies[sender] = proxy;

        emit MoonbirdsUserProxyRegistered(sender, proxy);
    }

    /**
     * @dev Gets user proxy address
     */
    function getUserProxy(address user) public view returns (address) {
        return _userProxies[user];
    }
}