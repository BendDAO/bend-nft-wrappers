// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

contract MockDelegationRegistry {
    mapping(address => uint256) public vaultVersions;
    mapping(bytes32 => bool) public allDelegateInfos;

    function delegateForToken(
        address delegate,
        address contract_,
        uint256 tokenId,
        bool value
    ) public {
        bytes32 delegateHash = keccak256(
            abi.encodePacked(msg.sender, vaultVersions[msg.sender], contract_, tokenId, delegate)
        );
        if (value) {
            allDelegateInfos[delegateHash] = value;
        } else {
            delete allDelegateInfos[delegateHash];
        }
    }

    function checkDelegateForToken(
        address delegate,
        address vault,
        address contract_,
        uint256 tokenId
    ) public view returns (bool) {
        bytes32 delegateHash = keccak256(
            abi.encodePacked(vault, vaultVersions[msg.sender], contract_, tokenId, delegate)
        );
        return allDelegateInfos[delegateHash];
    }

    function revokeAllDelegates() public {
        ++vaultVersions[msg.sender];
    }
}
