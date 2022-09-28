// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

interface IWrapperValidator {
    function underlyingToken() external view returns (IERC721Metadata);

    function isValid(address collection, uint256 tokenId) external view returns (bool);
}
