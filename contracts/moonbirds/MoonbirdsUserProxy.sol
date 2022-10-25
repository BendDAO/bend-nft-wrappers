// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IMoonbirds} from "./IMoonbirds.sol";

contract MoonbirdsUserProxy is IERC721Receiver {
    address private immutable _owner;
    IMoonbirds private immutable _moonbirds;

    /**
     * @dev Initializes the contract settings
     */
    constructor(address moonbirds_) {
        _owner = msg.sender;
        _moonbirds = IMoonbirds(moonbirds_);
    }

    /**
     * @dev Transfers bird to the smart contract owner
     */
    function transfer(uint256 tokenId) external {
        require(_owner == msg.sender, "MoonbirdsUserProxy: caller is not owner");
        _moonbirds.safeTransferWhileNesting(address(this), _owner, tokenId);
    }

    function onERC721Received(
        address,
        address,
        uint256 tokenId,
        bytes memory
    ) public virtual override returns (bytes4) {
        require(msg.sender == address(_moonbirds), "MoonbirdsUserProxy: only support moonbirds");
        (bool nesting, , ) = _moonbirds.nestingPeriod(tokenId);
        require(nesting, "MoonbirdsUserProxy: only support birds in nesting");
        return IERC721Receiver.onERC721Received.selector;
    }
}
