// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {IERC721Wrapper} from "./interfaces/IERC721Wrapper.sol";
import {IWrapperValidator} from "./interfaces/IWrapperValidator.sol";
import {IWrapperRegistry} from "./interfaces/IWrapperRegistry.sol";
import {ERC721Wrapper} from "./ERC721Wrapper.sol";

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";

contract WrapperRegistry is IWrapperRegistry, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    mapping(address => EnumerableSetUpgradeable.AddressSet) private _wrappers;

    function initialize() public initializer {
        __ReentrancyGuard_init();
        __Ownable_init();
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

    function findWrappers(address collection, uint256 tokenId)
        external
        view
        override
        returns (address[] memory wrappers)
    {
        EnumerableSetUpgradeable.AddressSet storage collectionWrappers = _wrappers[collection];
        address[] memory tmpWrappers = new address[](collectionWrappers.length());
        uint256 retNum = 0;
        for (uint256 i = 0; i < collectionWrappers.length(); i++) {
            address _wrapper = collectionWrappers.at(i);
            if (IERC721Wrapper(_wrapper).validator().isValid(collection, tokenId)) {
                tmpWrappers[retNum] = _wrapper;
                retNum++;
            }
        }

        if (collectionWrappers.length() == retNum) {
            return tmpWrappers;
        }

        wrappers = new address[](retNum);
        for (uint256 i = 0; i < retNum; i++) {
            wrappers[i] = tmpWrappers[i];
        }
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
        EnumerableSetUpgradeable.AddressSet storage collectionWrappers = _wrappers[collection];
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
