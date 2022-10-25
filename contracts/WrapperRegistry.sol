// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {IERC721Wrapper} from "./interfaces/IERC721Wrapper.sol";
import {IWrapperValidator} from "./interfaces/IWrapperValidator.sol";
import {IWrapperRegistry} from "./interfaces/IWrapperRegistry.sol";
import {ERC721Wrapper} from "./ERC721Wrapper.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

contract WrapperRegistry is IWrapperRegistry, Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

    mapping(address => EnumerableSet.AddressSet) private _wrappers;

    function createWrapper(
        address collection,
        address validator,
        string memory name,
        string memory symbol
    ) external override onlyOwner returns (address wrapper) {
        require(collection != address(0), "WrapperRegistry: collection can't be zero address");
        require(validator != address(0), "WrapperRegistry: validator can't be zero address");
        wrapper = address(new ERC721Wrapper(IERC721Metadata(collection), IWrapperValidator(validator), name, symbol));
        emit WrapperCreated(wrapper, collection, validator);
    }

    function registerWrapper(address wrapper) external override onlyOwner {
        require(!_isRegistered(wrapper), "WrapperRegistry: wrapper already registered");
        _wrappers[address(IERC721Wrapper(wrapper).underlyingToken())].add(wrapper);
        emit WrapperRegistered(wrapper);
    }

    function unregisterWrapper(address wrapper) external override onlyOwner {
        require(_isRegistered(wrapper), "WrapperRegistry: wrapper not registered");
        _wrappers[address(IERC721Wrapper(wrapper).underlyingToken())].remove(wrapper);
        emit WrapperUnregistered(wrapper);
    }

    function findWrapper(address collection, uint256 tokenId) external view override returns (address wrapper) {
        EnumerableSet.AddressSet storage collectionWrappers = _wrappers[collection];
        for (uint256 i = 0; i < collectionWrappers.length(); i++) {
            require(wrapper == address(0), "WrapperRegistry: multi wrappers found");
            address _wrapper = collectionWrappers.at(i);
            if (IERC721Wrapper(_wrapper).validator().isValid(collection, tokenId)) {
                wrapper = _wrapper;
            }
        }
        require(wrapper != address(0), "WrapperRegistry: no wrapper found");
    }

    function updateValidator(address wrapper, address validator) external override onlyOwner {
        IERC721Wrapper(wrapper).updateValidator(validator);
    }

    function isRegistered(address wrapper) external view returns (bool) {
        return _isRegistered(wrapper);
    }

    function _isRegistered(address wrapper) private view returns (bool) {
        return _wrappers[address(IERC721Wrapper(wrapper).underlyingToken())].contains(wrapper);
    }

    function viewCollectionWrapperCount(address collection) external view override returns (uint256) {
        return _wrappers[collection].length();
    }

    function viewCollectionWrappers(
        address collection,
        uint256 cursor,
        uint256 size
    ) external view override returns (address[] memory, uint256) {
        EnumerableSet.AddressSet storage collectionWrappers = _wrappers[collection];
        uint256 length = size;
        if (length > collectionWrappers.length() - cursor) {
            length = collectionWrappers.length() - cursor;
        }
        address[] memory result = new address[](length);

        for (uint256 i = 0; i < length; i++) {
            result[i] = collectionWrappers.at(cursor + i);
        }
        return (result, cursor + length);
    }
}
