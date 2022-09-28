// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

interface IWrapperRegistry {
    event WrapperCreated(address indexed wrapper, address indexed collection, address indexed validator);
    event WrapperRegistered(address indexed wrapper);
    event WrapperUnregistered(address indexed wrapper);

    function createWrapper(address collection, address validator) external returns (address wrapper);

    function registerWrapper(address wrapper) external;

    function unregisterWrapper(address wrapper) external;

    function findWrapper(address collection, uint256 tokenId) external returns (address wrapper);

    function updateValidator(address wrapper, address validator) external;

    function isRegistered(address wrapper) external view returns (bool);

    function viewCollectionWrapperCount(address collection) external view returns (uint256);

    function viewCollectionWrappers(
        address collection,
        uint256 cursor,
        uint256 size
    ) external view returns (address[] memory, uint256);
}
