// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {IWrapperValidator} from "./IWrapperValidator.sol";

interface IERC721Wrapper is IERC721Metadata {
    event FlashLoan(address indexed target, address indexed initiator, address indexed token, uint256 tokenId);
    event ValidatorUpdated(address indexed previousValidator, address indexed currentValidator);

    function underlyingToken() external view returns (IERC721Metadata);

    function validator() external view returns (IWrapperValidator);

    function updateValidator(address validator) external;

    function mint(uint256 tokenId) external;

    function burn(uint256 tokenId) external;

    function flashLoan(
        address receiverAddress,
        uint256[] calldata tokenIds,
        bytes calldata params
    ) external;
}
