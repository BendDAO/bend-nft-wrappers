// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";
import {IWrapperValidator} from "./IWrapperValidator.sol";

interface IERC721Wrapper is IERC721MetadataUpgradeable {
    event FlashLoan(address indexed target, address indexed initiator, address indexed token, uint256 tokenId);
    event ValidatorUpdated(address indexed previousValidator, address indexed currentValidator);
    event FlashLoanEnabled(bool enabled);
    event MintEnabled(bool enabled);
    event DelegateCashUpdated(address oldDelegateCash, address newDelegateCash);
    event DelegateCashForTokenUpdated(uint256 tokenId, bool value); // obsolete
    event DelegateCashForTokenV11Updated(address delegate, uint256 tokenId, bool value);
    event OwnershipDelegateEnabled(bool enabled);
    event AllDelegateCashRevoked();

    function underlyingToken() external view returns (IERC721MetadataUpgradeable);

    function validator() external view returns (IWrapperValidator);

    function isFlashLoanEnabled() external view returns (bool);

    function isMintEnabled() external view returns (bool);

    function isOwnershipDelegateEnabled() external view returns (bool);

    function updateValidator(address validator) external;

    function mint(uint256 tokenId) external;

    function burn(uint256 tokenId) external;

    function flashLoan(
        address receiverAddress,
        uint256[] calldata tokenIds,
        bytes calldata params
    ) external;

    function delegateCashContract() external view returns (address);

    function hasDelegateCashForToken(uint256 tokenId) external view returns (bool);

    function getDelegateCashForToken(uint256 tokenId) external view returns (address);

    function setDelegateCashForToken(
        address delegate,
        uint256[] calldata tokenIds,
        bool value
    ) external;
}
