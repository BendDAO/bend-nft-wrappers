// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {BitMaps} from "./libraries/BitMaps.sol";
import {IWrapperValidator, IERC721Metadata} from "./interfaces/IWrapperValidator.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BitmapValidator is IWrapperValidator, Ownable {
    struct KeyEntry {
        uint256 key;
        uint256 value;
    }
    using BitMaps for BitMaps.BitMap;
    IERC721Metadata public immutable override underlyingToken;
    BitMaps.BitMap private _bitmap;

    constructor(address underlyingToken_, uint256[] memory data_) {
        underlyingToken = IERC721Metadata(underlyingToken_);
        _bitmap.init(data_);
    }

    function isValid(address collection, uint256 tokenId) external view returns (bool) {
        require(collection == address(underlyingToken), "BitmapValidator: collection mismatch");
        return _bitmap.get(tokenId);
    }

    function setBitMapValues(KeyEntry[] calldata entries) external onlyOwner {
        for (uint256 i = 0; i < entries.length; i++) {
            KeyEntry memory entry = entries[i];
            _bitmap.setValue(entry.key, entry.value);
        }
    }

    function setBitMapValue(uint256 key, uint256 value) external onlyOwner {
        _bitmap.setValue(key, value);
    }

    function enableTokenIds(uint256[] calldata tokenIds) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _bitmap.set(tokenIds[i]);
        }
    }

    function disableTokenIds(uint256[] calldata tokenIds) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _bitmap.unset(tokenIds[i]);
        }
    }

    function viewBitMapValue(uint256 key) external view returns (uint256) {
        return _bitmap.getValue(key);
    }

    function viewBitmapKeys(uint256 cursor, uint256 size) external view returns (uint256[] memory, uint256) {
        return _bitmap.viewKeys(cursor, size);
    }

    function viewBitMapKeyCount() external view returns (uint256) {
        return _bitmap.getKeyCount();
    }
}
