// 修改鍵盤事件監聽器
document.addEventListener('keydown', event => {
    // 阻止方向鍵和空格鍵的預設行為
    if ([32, 37, 38, 39, 40].includes(event.keyCode)) {
        event.preventDefault(); // 阻止預設的滾動行為
    }

    if (game.gameOver || game.isPaused) return;

    switch (event.keyCode) {
        case 37: // 左
            game.piece.move(-1, 0);
            break;
        case 39: // 右
            game.piece.move(1, 0);
            break;
        case 40: // 下
            game.piece.move(0, 1);
            break;
        case 38: // 上 (旋轉)
            game.piece.rotate();
            break;
        case 32: // 空格 (直接下落)
            while (game.piece.move(0, 1)) {}
            break;
        case 67: // C (Hold)
            game.holdCurrentPiece();
            break;
        case 80: // P (暫停)
            game.isPaused = !game.isPaused;
            document.getElementById('pauseBtn').textContent = game.isPaused ? '繼續' : '暫停';
            break;
    }
});

// 可選：也阻止空格鍵的預設行為（防止頁面滾動）
document.addEventListener('keyup', event => {
    if ([32, 37, 38, 39, 40].includes(event.keyCode)) {
        event.preventDefault();
    }
});

// 可選：防止遊戲區域的滾動行為
document.querySelector('.game-container').addEventListener('click', event => {
    event.preventDefault();
});

// 初始化 Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const BLOCK_SIZE = 30;
const COLS = canvas.width / BLOCK_SIZE;
const ROWS = canvas.height / BLOCK_SIZE;

// 顏色和形狀定義
const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FFA500'];
const SHAPES = [
    [[1, 1, 1, 1]],  // I
    [[1, 1], [1, 1]], // O
    [[1, 1, 0], [0, 1, 1]], // Z
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 1, 1], [0, 1, 0]]  // T
];

class Tetromino {
    constructor(shape = null) {
        if (shape) {
            this.shape = JSON.parse(JSON.stringify(shape.shape));
            this.color = shape.color;
        } else {
            const shapeIndex = Math.floor(Math.random() * SHAPES.length);
            this.shape = SHAPES[shapeIndex];
            this.color = COLORS[shapeIndex];
        }
        this.x = Math.floor((COLS - this.shape[0].length) / 2);
        this.y = 0;
    }

    draw() {
        ctx.fillStyle = this.color;
        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillRect(
                        (this.x + x) * BLOCK_SIZE,
                        (this.y + y) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
    }

    move(dx, dy) {
        const oldX = this.x;
        const oldY = this.y;
        this.x += dx;
        this.y += dy;

        if (this.collision()) {
            this.x = oldX;
            this.y = oldY;
            if (dy > 0) {
                game.lockPiece();
                return false;
            }
        }
        return true;
    }

    rotate() {
        const oldShape = this.shape;
        this.shape = this.shape[0].map((_, i) =>
            this.shape.map(row => row[row.length - 1 - i])
        );

        if (this.collision()) {
            this.shape = oldShape;
            return false;
        }
        return true;
    }

    collision() {
        return this.shape.some((row, dy) => {
            return row.some((value, dx) => {
                if (!value) return false;
                const newX = this.x + dx;
                const newY = this.y + dy;
                return (
                    newX < 0 ||
                    newX >= COLS ||
                    newY >= ROWS ||
                    (newY >= 0 && game.grid[newY] && game.grid[newY][newX])
                );
            });
        });
    }
}

class Game {
    constructor() {
        this.reset();
        this.initNextPieceCanvas();
        this.initHoldPieceCanvas();
    }

    reset() {
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        this.piece = new Tetromino();
        this.nextPiece = new Tetromino();
        this.holdPiece = null;
        this.canHold = true;
        this.gameOver = false;
        this.isPaused = false;
        document.getElementById('gameOver').style.display = 'none';
        this.updateScore();
    }

    initNextPieceCanvas() {
        this.nextCanvas = document.getElementById('nextPiece');
        this.nextCtx = this.nextCanvas.getContext('2d');
    }

    initHoldPieceCanvas() {
        this.holdCanvas = document.getElementById('holdPiece');
        this.holdCtx = this.holdCanvas.getContext('2d');
    }

    holdCurrentPiece() {
        if (!this.canHold) return;

        if (this.holdPiece === null) {
            this.holdPiece = {
                shape: JSON.parse(JSON.stringify(this.piece.shape)),
                color: this.piece.color
            };
            this.piece = this.nextPiece;
            this.nextPiece = new Tetromino();
        } else {
            const tempShape = JSON.parse(JSON.stringify(this.piece.shape));
            const tempColor = this.piece.color;
            
            this.piece = new Tetromino();
            this.piece.shape = this.holdPiece.shape;
            this.piece.color = this.holdPiece.color;
            this.piece.x = Math.floor((COLS - this.piece.shape[0].length) / 2);
            this.piece.y = 0;

            this.holdPiece = {
                shape: tempShape,
                color: tempColor
            };
        }

        this.canHold = false;
        this.drawHoldPiece();
    }

    drawNextPiece() {
        this.nextCtx.fillStyle = '#000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (this.nextPiece) {
            const blockSize = 30;
            const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * blockSize) / 2;
            const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * blockSize) / 2;

            this.nextPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.nextCtx.fillStyle = this.nextPiece.color;
                        this.nextCtx.fillRect(
                            offsetX + x * blockSize,
                            offsetY + y * blockSize,
                            blockSize - 1,
                            blockSize - 1
                        );
                    }
                });
            });
        }
    }

    drawHoldPiece() {
        this.holdCtx.fillStyle = '#000';
        this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
        
        if (this.holdPiece) {
            const blockSize = 30;
            const offsetX = (this.holdCanvas.width - this.holdPiece.shape[0].length * blockSize) / 2;
            const offsetY = (this.holdCanvas.height - this.holdPiece.shape.length * blockSize) / 2;

            this.holdPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.holdCtx.fillStyle = this.holdPiece.color;
                        this.holdCtx.fillRect(
                            offsetX + x * blockSize,
                            offsetY + y * blockSize,
                            blockSize - 1,
                            blockSize - 1
                        );
                    }
                });
            });
        }
    }

    lockPiece() {
        if (this.piece.y <= 0) {
            this.gameOver = true;
            this.gameOverScreen();
            return;
        }

        this.piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.grid[this.piece.y + y][this.piece.x + x] = this.piece.color;
                }
            });
        });

        this.clearLines();
        this.piece = this.nextPiece;
        this.nextPiece = new Tetromino();
        this.canHold = true;
    }

    clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== 0)) {
                this.grid.splice(y, 1);
                this.grid.unshift(Array(COLS).fill(0));
                linesCleared++;
                y++;
            }
        }
        if (linesCleared > 0) {
            this.updateScore(linesCleared);
        }
    }

    updateScore(clearedLines = 0) {
        if (clearedLines > 0) {
            this.score += clearedLines * 100 * this.level;
            this.lines += clearedLines;
            this.level = Math.floor(this.lines / 10) + 1;
        }
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }

    draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = value;
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            });
        });

        this.piece.draw();
        this.drawNextPiece();
        this.drawHoldPiece();
    }

    gameOverScreen() {
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('finalScore').textContent = this.score;
    }
}

const game = new Game();
let dropCounter = 0;
let lastTime = 0;
let dropInterval = 1000;

function update(time = 0) {
    if (game.gameOver) {
        return;
    }

    if (game.isPaused) {
        requestAnimationFrame(update);
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        game.piece.move(0, 1);
        dropCounter = 0;
    }

    game.draw();
    requestAnimationFrame(update);
}

document.getElementById('startBtn').addEventListener('click', () => {
    game.reset();
    update();
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    game.isPaused = !game.isPaused;
    document.getElementById('pauseBtn').textContent = game.isPaused ? '繼續' : '暫停';
});

// 開始遊戲
update();