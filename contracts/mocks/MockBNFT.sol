// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

/**
 * @title MockBNFT
 * @dev MockBNFT minting logic
 */
contract MockBNFT is ERC721Enumerable, ERC721Holder {
    string public baseURI;
    address public underlyingAsset;

    constructor(
        address underlyingAsset_,
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {
        underlyingAsset = underlyingAsset_;
    }

    function mint(uint256 tokenId) public {
        IERC721Metadata(underlyingAsset).safeTransferFrom(_msgSender(), address(this), tokenId);

        _mint(_msgSender(), tokenId);
    }

    function burn(uint256 tokenId) public {
        require(_msgSender() == ownerOf(tokenId), "caller not owner");

        _burn(tokenId);

        IERC721Metadata(underlyingAsset).safeTransferFrom(address(this), _msgSender(), tokenId);
    }
}
