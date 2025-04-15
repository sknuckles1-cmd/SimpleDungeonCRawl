document.addEventListener('DOMContentLoaded', () => {
    // --- Game Elements ---
    const gameBoard = document.getElementById('game-board');
    const playerHpSpan = document.getElementById('player-hp');
    const playerMaxHpSpan = document.getElementById('player-max-hp');
    const shieldStatusSpan = document.getElementById('shield-status');
    const enemyCountSpan = document.getElementById('enemy-count');
    const gameLogUl = document.getElementById('game-log');
    const gameOverP = document.getElementById('game-over');

    // --- Game Configuration ---
    const TILE_SIZE = 30; // Must match CSS .tile width/height
    const MAP_WIDTH = 15;
    const MAP_HEIGHT = 10;

    const TILE_TYPES = {
        FLOOR: '.',
        WALL: '#',
        PLAYER: '@',
        ENEMY: 'E'
    };

    const MAP_LAYOUT = [
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
        shieldModifier: 0.5 // Damage taken is multiplied by this when shield is up
    };

    let enemies = []; // Array of enemy objects { x, y, hp, maxHp, attack }
    let gameMap = []; // 2D array representing the walkable map
    let gameOver = false;

    // --- Functions ---

    function addLog(message) {
        const li = document.createElement('li');
        li.textContent = message;
        // Add to the top of the log
        gameLogUl.insertBefore(li, gameLogUl.firstChild);
        // Limit log length (optional)
        if (gameLogUl.children.length > 10) {
            gameLogUl.removeChild(gameLogUl.lastChild);
        }
    }

    function initializeGame() {
        gameMap = [];
        enemies = [];
        gameOver = false;
        gameOverP.classList.add('hidden'); // Hide game over message

        // Parse MAP_LAYOUT
        for (let y = 0; y < MAP_HEIGHT; y++) {
            gameMap[y] = [];
            for (let x = 0; x < MAP_WIDTH; x++) {
                const tile = MAP_LAYOUT[y][x];
                if (tile === TILE_TYPES.PLAYER) {
                    player.x = x;
                    player.y = y;
                    gameMap[y][x] = TILE_TYPES.FLOOR; // Place floor under player
                } else if (tile === TILE_TYPES.ENEMY) {
                    enemies.push({
                        x: x,
                        y: y,
                        hp: 30,
                        maxHp: 30,
                        attack: 10
                    });
                    gameMap[y][x] = TILE_TYPES.FLOOR; // Place floor under enemy
                } else {
                    gameMap[y][x] = tile;
                }
            }
        }

        player.hp = player.maxHp;
        player.shieldUp = false;

        setupGameBoardStyles();
        drawGame();
        addLog("Game started. Find and defeat the enemies (E)!");
    }

    function setupGameBoardStyles() {
        gameBoard.style.gridTemplateColumns = `repeat(${MAP_WIDTH}, ${TILE_SIZE}px)`;
        gameBoard.style.gridTemplateRows = `repeat(${MAP_HEIGHT}, ${TILE_SIZE}px)`;
    }

    function drawGame() {
        if (gameOver) return;

        // Clear board
        gameBoard.innerHTML = '';

        // Draw map tiles
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const tileDiv = document.createElement('div');
                tileDiv.classList.add('tile');
                const tileType = gameMap[y][x];

                if (tileType === TILE_TYPES.WALL) {
                    tileDiv.classList.add('wall');
                    tileDiv.textContent = '#';
                } else {
                    tileDiv.classList.add('floor');
                    tileDiv.textContent = '.';
                }
                gameBoard.appendChild(tileDiv);
            }
        }

         // Get all the tile divs created above
         const tileDivs = gameBoard.children;

        // Draw player
        const playerIndex = player.y * MAP_WIDTH + player.x;
        if(tileDivs[playerIndex]) {
            tileDivs[playerIndex].classList.add('player');
            tileDivs[playerIndex].textContent = '@';
        }


        // Draw enemies
        enemies.forEach(enemy => {
            const enemyIndex = enemy.y * MAP_WIDTH + enemy.x;
             if(tileDivs[enemyIndex]) {
                tileDivs[enemyIndex].classList.add('enemy');
                tileDivs[enemyIndex].textContent = 'E';
             }
        });

        // Update Status Panel
        playerHpSpan.textContent = player.hp;
        playerMaxHpSpan.textContent = player.maxHp;
        shieldStatusSpan.textContent = player.shieldUp ? 'UP!' : 'Down';
        shieldStatusSpan.className = player.shieldUp ? 'active' : 'inactive';
        enemyCountSpan.textContent = enemies.length;

        // Check win condition
        if (enemies.length === 0) {
             endGame(true); // Player wins
        }
    }

    function movePlayer(dx, dy) {
        if (gameOver) return;

        const newX = player.x + dx;
        const newY = player.y + dy;

        // Check boundaries
        if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
            addLog("You bump into the edge of the world.");
            return;
        }

        // Check walls
        if (gameMap[newY][newX] === TILE_TYPES.WALL) {
            addLog("Ouch! You walked into a wall.");
            return;
        }

        // Check for enemy collision (attack)
        const enemyIndex = enemies.findIndex(e => e.x === newX && e.y === newY);
        if (enemyIndex !== -1) {
            attackEnemy(enemyIndex);
        } else {
            // Move player
            player.x = newX;
            player.y = newY;
            addLog(`You move ${getDirection(dx, dy)}.`);
        }

        // After player moves/attacks, enemies get a turn
        enemyTurn();

        // Redraw the game state
        drawGame();

        // Check if player died after enemy turn
        if (player.hp <= 0) {
             endGame(false); // Player loses
        }
    }

     function getDirection(dx, dy) {
        if (dx === 1) return "east";
        if (dx === -1) return "west";
        if (dy === 1) return "south";
        if (dy === -1) return "north";
        return "somewhere";
    }


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
    }

    function enemyTurn() {
        enemies.forEach((enemy, index) => {
            // Simple AI: Attack if adjacent to player
            const dx = Math.abs(player.x - enemy.x);
            const dy = Math.abs(player.y - enemy.y);

            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                attackPlayer(enemy);
            }
            // Could add basic movement logic here later
        });
    }

    function attackPlayer(enemy) {
        let damage = enemy.attack;
        let message = `An enemy attacks you for ${damage}`;

        if (player.shieldUp) {
            damage = Math.round(damage * player.shieldModifier); // Apply shield reduction
            message += ` but your shield absorbs some, reducing it to ${damage}!`;
        } else {
             message += `!`;
        }

        player.hp -= damage;
        player.hp = Math.max(0, player.hp); // Prevent HP going below 0

        addLog(message);
    }

    function toggleShield() {
         if (gameOver) return;
        player.shieldUp = !player.shieldUp;
        if (player.shieldUp) {
            addLog("Shields up!");
        } else {
            addLog("Shields down.");
        }
        // No enemy turn just for raising/lowering shield
        drawGame(); // Update shield status display
    }

     function endGame(playerWon) {
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


    // --- Event Listener ---
    function handleKeyPress(event) {
        if (gameOver) return;

        switch (event.key) {
            case 'ArrowUp':
            case 'w': // Optional WASD
                movePlayer(0, -1);
                break;
            case 'ArrowDown':
             case 's': // Optional WASD
                movePlayer(0, 1);
                break;
            case 'ArrowLeft':
             case 'a': // Optional WASD
                movePlayer(-1, 0);
                break;
            case 'ArrowRight':
             case 'd': // Optional WASD
                movePlayer(1, 0);
                break;
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
