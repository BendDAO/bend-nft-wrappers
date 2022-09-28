// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.9;

interface IWrapperGateway {
    /**
     * @dev Allows users to borrow a specific `amount` of the reserve underlying asset, provided that the borrower
     * already deposited enough collateral
     * - E.g. User borrows 100 USDC, receiving the 100 USDC in his wallet
     *   and lock collateral asset in contract
     * @param reserveAsset The address of the underlying asset to borrow
     * @param amount The amount to be borrowed
     * @param tokenId The token id of the wrapper used as collteral
     * @param onBehalfOf Address of the user who will receive the loan. Should be the address of the borrower itself
     * calling the function if he wants to borrow against his own collateral, or the address of the credit delegator
     * if he has been given credit delegation allowance
     * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
     *   0 if the action is executed directly by the user, without any middle-man
     **/
    function borrow(
        address reserveAsset,
        uint256 amount,
        uint256 tokenId,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function batchBorrow(
        address[] calldata reserveAssets,
        uint256[] calldata amounts,
        uint256[] calldata tokenIds,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    /**
     * @notice Repays a borrowed `amount` on a specific wrapper, burning the equivalent loan owned
     * - E.g. User repays 100 USDC, burning loan and receives collateral asset
     * @param tokenId The token id of the wrapper used as collteral
     * @param amount The amount to repay
     * @return The final amount repaid, loan is burned or not
     **/
    function repay(uint256 tokenId, uint256 amount) external returns (uint256, bool);

    function batchRepay(uint256[] calldata tokenIds, uint256[] calldata amounts)
        external
        returns (uint256[] memory, bool[] memory);

    /**
     * @notice auction a unhealth wrapper loan with ERC20 reserve
     * @param tokenId The token id of the wrapper used as collteral
     * @param bidPrice The bid price
     **/
    function auction(
        uint256 tokenId,
        uint256 bidPrice,
        address onBehalfOf
    ) external;

    /**
     * @notice redeem a unhealth wrapper loan with ERC20 reserve
     * @param tokenId The token id of the wrapper used as collteral
     * @param amount The amount to repay the debt
     * @param bidFine The amount of bid fine
     **/
    function redeem(
        uint256 tokenId,
        uint256 amount,
        uint256 bidFine
    ) external returns (uint256);

    /**
     * @notice liquidate a unhealth wrapper loan with ERC20 reserve
     * @param tokenId The token id of the wrapper used as collteral
     **/
    function liquidate(uint256 tokenId, uint256 amount) external returns (uint256);

    /**
     * @dev Allows users to borrow a specific `amount` of the reserve underlying asset, provided that the borrower
     * already deposited enough collateral
     * - E.g. User borrows 100 ETH, receiving the 100 ETH in his wallet
     *   and lock collateral asset in contract
     * @param amount The amount to be borrowed
     * @param tokenId The index of the Cryptowrapper to deposit
     * @param onBehalfOf Address of the user who will receive the loan. Should be the address of the borrower itself
     * calling the function if he wants to borrow against his own collateral, or the address of the credit delegator
     * if he has been given credit delegation allowance
     * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
     *   0 if the action is executed directly by the user, without any middle-man
     **/
    function borrowETH(
        uint256 amount,
        uint256 tokenId,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function batchBorrowETH(
        uint256[] calldata amounts,
        uint256[] calldata tokenIds,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    /**
     * @notice Repays a borrowed `amount` on a specific wrapper with native ETH
     * - E.g. User repays 100 ETH, burning loan and receives collateral asset
     * @param tokenId The index of the Cryptowrapper to repay
     * @param amount The amount to repay
     * @return The final amount repaid, loan is burned or not
     **/
    function repayETH(uint256 tokenId, uint256 amount) external payable returns (uint256, bool);

    function batchRepayETH(uint256[] calldata tokenIds, uint256[] calldata amounts)
        external
        payable
        returns (uint256[] memory, bool[] memory);

    /**
     * @notice auction a unhealth wrapper loan with native ETH
     * @param tokenId The index of the Cryptowrapper to repay
     * @param onBehalfOf Address of the user who will receive the Cryptowrapper. Should be the address of the user itself
     * calling the function if he wants to get collateral
     **/
    function auctionETH(uint256 tokenId, address onBehalfOf) external payable;

    /**
     * @notice liquidate a unhealth wrapper loan with native ETH
     * @param tokenId The index of the Cryptowrapper to repay
     * @param amount The amount to repay the debt
     * @param bidFine The amount of bid fine
     **/
    function redeemETH(
        uint256 tokenId,
        uint256 amount,
        uint256 bidFine
    ) external payable returns (uint256);

    /**
     * @notice liquidate a unhealth wrapper loan with native ETH
     * @param tokenId The index of the Cryptowrapper to repay
     **/
    function liquidateETH(uint256 tokenId) external payable returns (uint256);
}
