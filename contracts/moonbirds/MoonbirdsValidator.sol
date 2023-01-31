// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {IWrapperValidator} from "../interfaces/IWrapperValidator.sol";

import {IMoonbirds} from "./IMoonbirds.sol";

contract MoonbirdsValidator is IWrapperValidator, OwnableUpgradeable {
    address public override underlyingToken;

    function initialize(address underlyingToken_) public initializer {
        __Ownable_init();

        underlyingToken = underlyingToken_;
    }

    function isValid(address collection, uint256 tokenId) external view returns (bool) {
        require(collection == underlyingToken, "MoonbirdsValidator: collection mismatch");
        (bool nesting, , ) = IMoonbirds(underlyingToken).nestingPeriod(tokenId);
        return nesting;
    }
}
