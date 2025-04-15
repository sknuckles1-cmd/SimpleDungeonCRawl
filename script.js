document.addEventListener('DOMContentLoaded', () => {
    // --- Game Elements ---
    const playerHpSpan = document.getElementById('player-hp');
    const playerMaxHpSpan = document.getElementById('player-max-hp');
    const shieldStatusSpan = document.getElementById('shield-status');
    const playerDirectionSpan = document.getElementById('player-direction'); // New
    const enemyCountSpan = document.getElementById('enemy-count');
    const gameLogUl = document.getElementById('game-log');
    const gameOverP = document.getElementById('game-over');

    // Viewport Elements
    const viewAheadDiv = document.getElementById('view-ahead');
    const viewLeftDiagDiv = document.getElementById('view-left-diag');
    const viewRightDiagDiv = document.getElementById('view-right-diag');
    // Optional side views:
    // const viewLeftDiv = document.getElementById('view-left');
    // const viewRightDiv = document.getElementById('view-right');

    // Mini-Map Elements
    const miniMapDiv = document.getElementById('mini-map');


    // --- Game Configuration ---
    const MAP_WIDTH = 15;
    const MAP_HEIGHT = 10;

    const TILE_TYPES = {
        FLOOR: '.',
        WALL: '#',
        PLAYER: '@', // Still used for parsing map layout
        ENEMY: 'E'   // Still used for parsing map layout
    };

    const DIRECTIONS = { NORTH: 0, EAST: 1, SOUTH: 2, WEST: 3 };
    const DIRECTION_NAMES = ["North", "East", "South", "West"];
    const DIRECTION_VECTORS = [
        { x: 0, y: -1 }, // North
        { x: 1, y: 0 },  // East
        { x: 0, y: 1 },  // South
        { x: -1, y: 0 }  // West
    ];

    const MAP_LAYOUT = [ // Same map layout
        "###############",
        "#@....#.......#",
        "#..E..#...E...#",
        "#.....#####...#",
        "#..E..#.......#",
        "#.....#..E..#.#",
        "#####.#.....#.#",
        "#E....#..E..#.#",
        "#.....#.......#",
        "###############"
    ];

    // --- Game State ---
    let player = {
        x: 0,
        y: 0,
        hp: 100,
        maxHp: 100,
        shieldUp: false,
        shieldModifier: 0.5,
        direction: DIRECTIONS.EAST // Start facing East (towards the first corridor)
    };

    let enemies = [];
    let gameMap = []; // Still the 2D grid map
    let gameOver = false;

    // --- Functions ---

    function addLog(message) {
        const li = document.createElement('li');
        li.textContent = message;
        gameLogUl.insertBefore(li, gameLogUl.firstChild);
        if (gameLogUl.children.length > 10) {
            gameLogUl.removeChild(gameLogUl.lastChild);
        }
    }

    function initializeGame() {
        gameMap = [];
        enemies = [];
        gameOver = false;
        gameOverP.classList.add('hidden');

        // Parse MAP_LAYOUT (same as before)
        for (let y = 0; y < MAP_HEIGHT; y++) {
            gameMap[y] = [];
            for (let x = 0; x < MAP_WIDTH; x++) {
                const tile = MAP_LAYOUT[y][x];
                if (tile === TILE_TYPES.PLAYER) {
                    player.x = x;
                    player.y = y;
                    player.direction = DIRECTIONS.EAST; // Reset direction
                    gameMap[y][x] = TILE_TYPES.FLOOR;
                } else if (tile === TILE_TYPES.ENEMY) {
                    enemies.push({ x: x, y: y, hp: 30, maxHp: 30, attack: 10 });
                    gameMap[y][x] = TILE_TYPES.FLOOR;
                } else {
                    gameMap[y][x] = tile;
                }
            }
        }

        player.hp = player.maxHp;
        player.shieldUp = false;

        setupMiniMapStyles(); // Setup mini-map grid
        drawGame();
        addLog("Game started. Defeat the enemies (E)!");
    }

    function setupMiniMapStyles() {
        miniMapDiv.style.gridTemplateColumns = `repeat(${MAP_WIDTH}, 5px)`;
        miniMapDiv.style.gridTemplateRows = `repeat(${MAP_HEIGHT}, 5px)`;
    }


    // Renamed from drawGame to drawFirstPersonView
    function drawGame() {
        if (gameOver) return;

        // --- Update Viewport ---
        updateViewCell(viewAheadDiv,      { relX: 0, relY: -1 }); // Directly ahead
        updateViewCell(viewLeftDiagDiv,   { relX: -1, relY: -1 }); // Ahead-left
        updateViewCell(viewRightDiagDiv,  { relX: 1, relY: -1 }); // Ahead-right
        // Optional side views:
        // updateViewCell(viewLeftDiv,    { relX: -1, relY: 0 }); // Left
        // updateViewCell(viewRightDiv,   { relX: 1, relY: 0 }); // Right


        // --- Update Status Panel ---
        playerHpSpan.textContent = player.hp;
        playerMaxHpSpan.textContent = player.maxHp;
        shieldStatusSpan.textContent = player.shieldUp ? 'UP!' : 'Down';
        shieldStatusSpan.className = player.shieldUp ? 'active' : 'inactive';
        playerDirectionSpan.textContent = DIRECTION_NAMES[player.direction]; // Update direction display
        enemyCountSpan.textContent = enemies.length;

        // --- Update Mini-Map ---
        drawMiniMap();

        // Check win condition
        if (enemies.length === 0 && !gameOver) {
             endGame(true); // Player wins
        }
    }

    // Helper to get tile type at specific map coordinates
    function getTileAt(x, y) {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
            return TILE_TYPES.WALL; // Treat outside map as wall
        }
        if (enemies.some(e => e.x === x && e.y === y)) {
            return TILE_TYPES.ENEMY; // Special type for enemy
        }
        return gameMap[y][x]; // Return floor or wall from map data
    }

    // Helper to calculate absolute map coordinates based on player pos/dir and relative coords
    function getMapCoordinatesRelativeToPlayer(relX, relY) {
        const forward = DIRECTION_VECTORS[player.direction];
        // Calculate right vector (90 degrees clockwise from forward)
        const right = DIRECTION_VECTORS[(player.direction + 1) % 4];

        // Combine relative movements: relY moves forward/backward, relX moves right/left
        const finalX = player.x + (forward.x * -relY) + (right.x * relX); // Note: relY is negative for forward
        const finalY = player.y + (forward.y * -relY) + (right.y * relX);

        return { x: finalX, y: finalY };
    }

    // Updates a single view cell div
    function updateViewCell(divElement, relativePos) {
        const mapCoords = getMapCoordinatesRelativeToPlayer(relativePos.relX, relativePos.relY);
        const tileType = getTileAt(mapCoords.x, mapCoords.y);

        // Reset classes, keep base 'view-cell'
        divElement.className = 'view-cell';
        divElement.textContent = ''; // Clear previous content (like 'E')

        switch (tileType) {
            case TILE_TYPES.WALL:
                divElement.classList.add('view-wall');
                break;
            case TILE_TYPES.FLOOR:
                divElement.classList.add('view-floor');
                break;
            case TILE_TYPES.ENEMY:
                divElement.classList.add('view-enemy');
                divElement.textContent = 'E'; // Show enemy marker
                break;
            default: // Should not happen, but fallback
                 divElement.classList.add('view-empty');
                break;
        }
         // Add optional side class if needed for styling
         if(relativePos.relY === 0 && Math.abs(relativePos.relX) === 1) {
            // divElement.classList.add('side');
         }
    }

    // Function to draw the mini-map
    function drawMiniMap() {
        miniMapDiv.innerHTML = ''; // Clear previous map
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const tileDiv = document.createElement('div');
                tileDiv.classList.add('map-tile');
                if (x === player.x && y === player.y) {
                    tileDiv.classList.add('map-player');
                    // Add player direction indicator (optional)
                    // let arrow;
                    // switch(player.direction) {
                    //    case DIRECTIONS.NORTH: arrow = '^'; break;
                    //    case DIRECTIONS.EAST: arrow = '>'; break;
                    //    case DIRECTIONS.SOUTH: arrow = 'v'; break;
                    //    case DIRECTIONS.WEST: arrow = '<'; break;
                    // }
                    // tileDiv.textContent = arrow;
                    // tileDiv.style.color = 'white';
                } else if (enemies.some(e => e.x === x && e.y === y)) {
                    tileDiv.classList.add('map-enemy');
                } else if (gameMap[y][x] === TILE_TYPES.WALL) {
                    tileDiv.classList.add('map-wall');
                } else {
                    tileDiv.classList.add('map-floor');
                }
                miniMapDiv.appendChild(tileDiv);
            }
        }
    }


    // --- Movement and Actions ---

    function turnPlayer(turnDirection) { // -1 for left, 1 for right
        if (gameOver) return;
        player.direction = (player.direction + turnDirection + 4) % 4; // Loop direction
        addLog(`You turn ${turnDirection === -1 ? 'left' : 'right'}. Facing ${DIRECTION_NAMES[player.direction]}.`);
        // No enemy turn just for turning
        drawGame(); // Redraw view immediately
    }

    // Renamed from movePlayer to moveForward
    function moveForward() {
        if (gameOver) return;

        const forwardVector = DIRECTION_VECTORS[player.direction];
        const targetX = player.x + forwardVector.x;
        const targetY = player.y + forwardVector.y;

        // Check boundaries (redundant if map has walls, but good practice)
        if (targetX < 0 || targetX >= MAP_WIDTH || targetY < 0 || targetY >= MAP_HEIGHT) {
            addLog("Blocked by the void.");
            return;
        }

        // Check walls
        if (gameMap[targetY][targetX] === TILE_TYPES.WALL) {
            addLog("You bump into a wall.");
            // Optional: Play bump sound/visual effect
            return; // Don't move, don't trigger enemy turn
        }

        // Check for enemy collision (attack)
        const enemyIndex = enemies.findIndex(e => e.x === targetX && e.y === targetY);
        if (enemyIndex !== -1) {
            attackEnemy(enemyIndex); // Attack instead of moving
        } else {
            // Move player
            player.x = targetX;
            player.y = targetY;
            addLog(`You move forward.`);
        }

        // After player moves or attacks, enemies get a turn
        enemyTurn();

        // Redraw the game state
        drawGame();

        // Check if player died after enemy turn
        if (player.hp <= 0 && !gameOver) {
             endGame(false); // Player loses
        }
    }

     // Optional: Implement moveBackward or strafing if desired


    // Attack and Enemy Turn logic remains largely the same
     function attackEnemy(enemyIndex) {
        const enemy = enemies[enemyIndex];
        const damage = 20; // Player attack damage
        enemy.hp -= damage;
        addLog(`You attack the enemy for ${damage} damage!`);

        if (enemy.hp <= 0) {
            addLog("You defeated an enemy!");
            enemies.splice(enemyIndex, 1); // Remove enemy from array
        } else {
            addLog(`Enemy has ${enemy.hp}/${enemy.maxHp} HP left.`);
        }
        // Don't move player after attack
    }

    function enemyTurn() {
         enemies.forEach((enemy) => {
            // Simple AI: Attack if adjacent to player
            const dx = Math.abs(player.x - enemy.x);
            const dy = Math.abs(player.y - enemy.y);

            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                 // Check if enemy can "see" player (optional line-of-sight check)
                attackPlayer(enemy);
            }
            // Could add basic enemy movement here later (move towards player if far away)
        });
    }

     function attackPlayer(enemy) {
        let damage = enemy.attack;
        let message = `An enemy attacks you for ${damage}`;

        if (player.shieldUp) {
            damage = Math.round(damage * player.shieldModifier);
            message += ` but your shield absorbs some, reducing it to ${damage}!`;
        } else {
             message += `!`;
        }

        player.hp -= damage;
        player.hp = Math.max(0, player.hp);

        addLog(message);
        // HP update will happen in drawGame, but check for death now if needed
    }

    // Shield and Game Over logic remains the same
     function toggleShield() {
         if (gameOver) return;
        player.shieldUp = !player.shieldUp;
        addLog(player.shieldUp ? "Shields up!" : "Shields down.");
        drawGame(); // Update shield status display
    }

    function endGame(playerWon) {
        if (gameOver) return; // Prevent multiple calls
        gameOver = true;
        gameOverP.classList.remove('hidden');
        if (playerWon) {
            gameOverP.textContent = "YOU WIN! All enemies defeated!";
            gameOverP.style.color = "green";
            addLog("Congratulations!");
        } else {
            gameOverP.textContent = "GAME OVER - You were defeated!";
            gameOverP.style.color = "red";
            addLog("Better luck next time!");
        }
         // Optionally remove event listener here if needed
         // document.removeEventListener('keydown', handleKeyPress);
     }


    // --- Event Listener (Updated for new controls) ---
    function handleKeyPress(event) {
        if (gameOver) return;

        switch (event.key) {
            case 'ArrowUp':
            case 'w':
                moveForward();
                break;
            case 'ArrowDown':
            case 's':
                // moveBackward(); // Implement if desired
                addLog("Backward movement not implemented.");
                break;
            case 'ArrowLeft':
            case 'a':
                turnPlayer(-1); // Turn Left
                break;
            case 'ArrowRight':
            case 'd':
                turnPlayer(1); // Turn Right
                break;
             // Add keys for strafing if implemented (e.g., 'q', 'e')
            case ' ': // Spacebar for shield
                event.preventDefault(); // Prevent page scrolling
                toggleShield();
                break;
        }
    }

    document.addEventListener('keydown', handleKeyPress);

    // --- Start Game ---
    initializeGame();
});
