// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MintableERC721} from "./MintableERC721.sol";

contract MockMoonbirds is MintableERC721, Ownable {
    /// @notice Requires that msg.sender owns or is approved for the token.
    modifier onlyApprovedOrOwner(uint256 tokenId) {
        require(
            ownerOf(tokenId) == _msgSender() || getApproved(tokenId) == _msgSender(),
            "Moonbirds: Not approved nor owner"
        );
        _;
    }

    constructor(string memory name, string memory symbol) MintableERC721(name, symbol) {
        baseURI = "https://live---metadata-5covpqijaa-uc.a.run.app/metadata/";
    }

    /**
    @dev tokenId to nesting start time (0 = not nesting).
     */
    mapping(uint256 => uint256) private nestingStarted;

    /**
    @dev Cumulative per-token nesting, excluding the current period.
     */
    mapping(uint256 => uint256) private nestingTotal;

    /**
    @notice Returns the length of time, in seconds, that the Moonbird has
    nested.
    @dev Nesting is tied to a specific Moonbird, not to the owner, so it doesn't
    reset upon sale.
    @return nesting Whether the Moonbird is currently nesting. MAY be true with
    zero current nesting if in the same block as nesting began.
    @return current Zero if not currently nesting, otherwise the length of time
    since the most recent nesting began.
    @return total Total period of time for which the Moonbird has nested across
    its life, including the current period.
     */
    function nestingPeriod(uint256 tokenId)
        external
        view
        returns (
            bool nesting,
            uint256 current,
            uint256 total
        )
    {
        uint256 start = nestingStarted[tokenId];
        if (start != 0) {
            nesting = true;
            current = block.timestamp - start;
        }
        total = current + nestingTotal[tokenId];
    }

    /**
    @dev MUST only be modified by safeTransferWhileNesting(); if set to 2 then
    the _beforeTokenTransfer() block while nesting is disabled.
     */
    uint256 private nestingTransfer = 1;

    /**
    @notice Transfer a token between addresses while the Moonbird is minting,
    thus not resetting the nesting period.
     */
    function safeTransferWhileNesting(
        address from,
        address to,
        uint256 tokenId
    ) external {
        require(ownerOf(tokenId) == _msgSender(), "Moonbirds: Only owner");
        nestingTransfer = 2;
        safeTransferFrom(from, to, tokenId);
        nestingTransfer = 1;
    }

    /**
    @dev Block transfers while nesting.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        from;
        to;

        require(nestingStarted[tokenId] == 0 || nestingTransfer == 2, "Moonbirds: nesting");
    }

    /**
    @dev Emitted when a Moonbird begins nesting.
     */
    event Nested(uint256 indexed tokenId);

    /**
    @dev Emitted when a Moonbird stops nesting; either through standard means or
    by expulsion.
     */
    event Unnested(uint256 indexed tokenId);

    /**
    @dev Emitted when a Moonbird is expelled from the nest.
     */
    event Expelled(uint256 indexed tokenId);

    /**
    @notice Whether nesting is currently allowed.
    @dev If false then nesting is blocked, but unnesting is always allowed.
     */
    bool public nestingOpen = false;

    /**
    @notice Toggles the `nestingOpen` flag.
     */
    function setNestingOpen(bool open) external onlyOwner {
        nestingOpen = open;
    }

    /**
    @notice Changes the Moonbird's nesting status.
    */
    function toggleNesting(uint256 tokenId) internal onlyApprovedOrOwner(tokenId) {
        uint256 start = nestingStarted[tokenId];
        if (start == 0) {
            require(nestingOpen, "Moonbirds: nesting closed");
            nestingStarted[tokenId] = block.timestamp;
            emit Nested(tokenId);
        } else {
            nestingTotal[tokenId] += block.timestamp - start;
            nestingStarted[tokenId] = 0;
            emit Unnested(tokenId);
        }
    }

    /**
    @notice Changes the Moonbirds' nesting statuss (what's the plural of status?
    statii? statuses? status? The plural of sheep is sheep; maybe it's also the
    plural of status).
    @dev Changes the Moonbirds' nesting sheep (see @notice).
     */
    function toggleNesting(uint256[] calldata tokenIds) external {
        uint256 n = tokenIds.length;
        for (uint256 i = 0; i < n; ++i) {
            toggleNesting(tokenIds[i]);
        }
    }
}
