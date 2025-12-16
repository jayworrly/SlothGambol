// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ChipVault
 * @notice Manages AVAX deposits and withdrawals for the poker platform
 * @dev Handles player balances, table chip locking, and game settlements
 */
contract ChipVault is ReentrancyGuard, Ownable, Pausable {
    // ============ State Variables ============

    /// @notice Mapping of player address to their available balance (not locked in games)
    mapping(address => uint256) public availableBalance;

    /// @notice Mapping of player address to their locked balance (in active games)
    mapping(address => uint256) public lockedBalance;

    /// @notice Mapping of table ID to mapping of player address to locked amount at that table
    mapping(bytes32 => mapping(address => uint256)) public tableLockedAmount;

    /// @notice Authorized game server addresses that can lock/unlock/settle
    mapping(address => bool) public authorizedServers;

    /// @notice Minimum deposit amount (0.01 AVAX)
    uint256 public constant MIN_DEPOSIT = 0.01 ether;

    /// @notice Maximum deposit amount (1000 AVAX)
    uint256 public constant MAX_DEPOSIT = 1000 ether;

    // ============ Events ============

    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount);
    event ChipsLocked(address indexed player, bytes32 indexed tableId, uint256 amount);
    event ChipsUnlocked(address indexed player, bytes32 indexed tableId, uint256 amount);
    event TableSettled(bytes32 indexed tableId, address[] players, int256[] deltas);
    event ServerAuthorized(address indexed server);
    event ServerRevoked(address indexed server);

    // ============ Errors ============

    error InsufficientBalance();
    error InvalidAmount();
    error UnauthorizedServer();
    error TransferFailed();
    error PlayerNotAtTable();
    error ArrayLengthMismatch();

    // ============ Modifiers ============

    modifier onlyAuthorizedServer() {
        if (!authorizedServers[msg.sender]) revert UnauthorizedServer();
        _;
    }

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Player Functions ============

    /**
     * @notice Deposit AVAX to receive chip balance
     * @dev Adds to available balance, emits Deposited event
     */
    function deposit() external payable nonReentrant whenNotPaused {
        if (msg.value < MIN_DEPOSIT || msg.value > MAX_DEPOSIT) revert InvalidAmount();

        availableBalance[msg.sender] += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw AVAX from available balance
     * @param amount Amount to withdraw in wei
     * @dev Only withdraws from available balance (not locked in games)
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (availableBalance[msg.sender] < amount) revert InsufficientBalance();

        availableBalance[msg.sender] -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Get total balance (available + locked)
     * @param player Player address
     * @return Total balance in wei
     */
    function getTotalBalance(address player) external view returns (uint256) {
        return availableBalance[player] + lockedBalance[player];
    }

    /**
     * @notice Get available balance (not locked in games)
     * @param player Player address
     * @return Available balance in wei
     */
    function getAvailableBalance(address player) external view returns (uint256) {
        return availableBalance[player];
    }

    /**
     * @notice Get locked balance (in active games)
     * @param player Player address
     * @return Locked balance in wei
     */
    function getLockedBalance(address player) external view returns (uint256) {
        return lockedBalance[player];
    }

    // ============ Game Server Functions ============

    /**
     * @notice Lock chips when player joins a table
     * @param player Player address
     * @param amount Amount to lock
     * @param tableId Unique table identifier
     * @dev Only callable by authorized game servers
     */
    function lockChips(
        address player,
        uint256 amount,
        bytes32 tableId
    ) external onlyAuthorizedServer nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (availableBalance[player] < amount) revert InsufficientBalance();

        availableBalance[player] -= amount;
        lockedBalance[player] += amount;
        tableLockedAmount[tableId][player] += amount;

        emit ChipsLocked(player, tableId, amount);
    }

    /**
     * @notice Unlock chips when player leaves a table (without settlement)
     * @param player Player address
     * @param amount Amount to unlock
     * @param tableId Table identifier
     * @dev Only callable by authorized game servers
     */
    function unlockChips(
        address player,
        uint256 amount,
        bytes32 tableId
    ) external onlyAuthorizedServer nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (tableLockedAmount[tableId][player] < amount) revert PlayerNotAtTable();

        tableLockedAmount[tableId][player] -= amount;
        lockedBalance[player] -= amount;
        availableBalance[player] += amount;

        emit ChipsUnlocked(player, tableId, amount);
    }

    /**
     * @notice Settle a table - apply win/loss deltas to all players
     * @param tableId Table identifier
     * @param players Array of player addresses
     * @param deltas Array of balance changes (positive = won, negative = lost)
     * @dev Sum of deltas must equal zero (zero-sum game)
     * @dev Only callable by authorized game servers
     */
    function settleTable(
        bytes32 tableId,
        address[] calldata players,
        int256[] calldata deltas
    ) external onlyAuthorizedServer nonReentrant {
        if (players.length != deltas.length) revert ArrayLengthMismatch();
        if (players.length == 0) revert InvalidAmount();

        // Verify zero-sum
        int256 sum = 0;
        for (uint256 i = 0; i < deltas.length; i++) {
            sum += deltas[i];
        }
        require(sum == 0, "Deltas must sum to zero");

        // Apply deltas
        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            int256 delta = deltas[i];

            uint256 lockedAtTable = tableLockedAmount[tableId][player];

            if (delta >= 0) {
                // Player won or broke even
                uint256 winnings = uint256(delta);
                // Move locked chips back to available, plus winnings
                lockedBalance[player] -= lockedAtTable;
                availableBalance[player] += lockedAtTable + winnings;
            } else {
                // Player lost
                uint256 losses = uint256(-delta);
                require(lockedAtTable >= losses, "Loss exceeds locked amount");
                // Move remaining chips back to available
                lockedBalance[player] -= lockedAtTable;
                availableBalance[player] += lockedAtTable - losses;
            }

            // Clear table lock
            tableLockedAmount[tableId][player] = 0;
        }

        emit TableSettled(tableId, players, deltas);
    }

    /**
     * @notice Get player's locked amount at a specific table
     * @param tableId Table identifier
     * @param player Player address
     * @return Amount locked at table
     */
    function getTableLockedAmount(bytes32 tableId, address player) external view returns (uint256) {
        return tableLockedAmount[tableId][player];
    }

    // ============ Admin Functions ============

    /**
     * @notice Authorize a game server address
     * @param server Server address to authorize
     */
    function authorizeServer(address server) external onlyOwner {
        authorizedServers[server] = true;
        emit ServerAuthorized(server);
    }

    /**
     * @notice Revoke authorization from a game server
     * @param server Server address to revoke
     */
    function revokeServer(address server) external onlyOwner {
        authorizedServers[server] = false;
        emit ServerRevoked(server);
    }

    /**
     * @notice Pause the contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw all funds to owner (only when paused)
     * @dev Use only in emergencies
     */
    function emergencyWithdraw() external onlyOwner whenPaused {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        if (!success) revert TransferFailed();
    }

    // ============ Receive Function ============

    /// @notice Allow receiving AVAX directly (treated as deposit)
    receive() external payable {
        if (msg.value >= MIN_DEPOSIT && msg.value <= MAX_DEPOSIT && !paused()) {
            availableBalance[msg.sender] += msg.value;
            emit Deposited(msg.sender, msg.value);
        }
    }
}
