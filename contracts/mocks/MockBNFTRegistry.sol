// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

contract MockBNFTRegistry {
    mapping(address => address) public bnftProxies;
    mapping(address => address) public bnftImpls;

    function getBNFTAddresses(address nftAsset) public view returns (address bNftProxy, address bNftImpl) {
        return (bnftProxies[nftAsset], bnftImpls[nftAsset]);
    }

    function setBNFTAddresses(
        address nftAsset,
        address bnftProxy,
        address bnftImpl
    ) public {
        (bnftProxies[nftAsset], bnftImpls[nftAsset]) = (bnftProxy, bnftImpl);
    }
}
