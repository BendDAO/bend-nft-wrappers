// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IMoonbirds} from "./IMoonbirds.sol";

contract MoonbirdsUserProxy is Initializable, IERC721Receiver {
    address private _owner;
    IMoonbirds private _moonbirds;

    modifier onlyOwner() {
        require(msg.sender == _owner, "MoonbirdsUserProxy: permission denied");
        _;
    }

    /**
     * @dev Initializes the contract settings
     */
    function initialize(address owner_, address moonbirds_) external initializer {
        _owner = owner_;
        _moonbirds = IMoonbirds(moonbirds_);
    }

    /**
     * @dev Transfers bird to the smart contract owner
     */
    function transfer(uint256 tokenId) external onlyOwner {
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
