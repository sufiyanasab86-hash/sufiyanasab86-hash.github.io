class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Game state
        this.gameRunning = true;
        this.score = 0;
        this.coins = 0;
        this.health = 100;
        
        // Player
        this.player = {
            x: 100,
            y: 100,
            width: 40,
            height: 40,
            speed: 4,
            angle: 0
        };
        
        // Input
        this.keys = {};
        this.touchActive = false;
        this.joystickActive = false;
        this.joystickCenter = { x: 0, y: 0 };
        this.joystickAngle = 0;
        this.joystickDistance = 0;
        
        // Game objects
        this.bullets = [];
        this.zombies = [];
        this.particles = [];
        this.coinsList = [];
        
        // Game loop
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.shootCooldown = 0;
        
        this.init();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    resizeCanvas() {
        const size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.95);
        this.canvas.width = size;
        this.canvas.height = size;
        this.canvasRect = this.canvas.getBoundingClientRect();
    }
    
    init() {
        window.addEventListener('resize', () => this.resizeCanvas());
        this.spawnZombie();
    }
    
    setupEventListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse shooting
        this.canvas.addEventListener('click', (e) => this.shoot(e));
        
        // Mobile controls
        const shootBtn = document.getElementById('shootBtn');
        shootBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.shoot(e);
        });
        shootBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.shoot(e);
        });
        
        // Joystick
        const joystick = document.getElementById('joystick');
        joystick.addEventListener('touchstart', (e) => this.handleJoystickStart(e), { passive: false });
        joystick.addEventListener('touchmove', (e) => this.handleJoystickMove(e), { passive: false });
        joystick.addEventListener('touchend', (e) => this.handleJoystickEnd(e), { passive: false });
    }
    
    handleJoystickStart(e) {
        e.preventDefault();
        this.joystickActive = true;
        this.updateJoystickPosition(e);
    }
    
    handleJoystickMove(e) {
        if (!this.joystickActive) return;
        e.preventDefault();
        this.updateJoystickPosition(e);
    }
    
    handleJoystickEnd(e) {
        e.preventDefault();
        this.joystickActive = false;
        this.joystickAngle = 0;
        this.joystickDistance = 0;
        this.updateJoystickVisual();
    }
    
    updateJoystickPosition(e) {
        const rect = e.target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const touch = e.touches[0];
        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const distance = Math.min(30, Math.sqrt(dx * dx + dy * dy));
        this.joystickAngle = Math.atan2(dy, dx);
        this.joystickDistance = distance;
        
        this.updateJoystickVisual();
    }
    
    updateJoystickVisual() {
        const knob = document.querySelector('.joystick-knob');
        const maxDistance = 30;
        const distance = Math.min(maxDistance, this.joystickDistance);
        const x = Math.cos(this.joystickAngle) * distance;
        const y = Math.sin(this.joystickAngle) * distance;
        knob.style.transform = `translate(${x}px, ${y}px)`;
    }
    
    shoot(e) {
        if (this.shootCooldown > 0 || !this.gameRunning) return;
        
        const rect = this.canvas.getBoundingClientRect();
        let targetX, targetY;
        
        if (e.type === 'touchstart') {
            const touch = e.touches[0];
            targetX = touch.clientX - rect.left;
            targetY = touch.clientY - rect.top;
        } else {
            targetX = e.clientX - rect.left;
            targetY = e.clientY - rect.top;
        }
        
        const angle = Math.atan2(targetY - this.canvas.height/2, targetX - this.canvas.width/2);
        
        this.bullets.push({
            x: this.canvas.width/2,
            y: this.canvas.height/2,
            vx: Math.cos(angle) * 10,
            vy: Math.sin(angle) * 10,
            life: 100
        });
        
        this.shootCooldown = 10;
        this.createShootEffect(angle);
    }
    
    update(deltaTime) {
        if (!this.gameRunning) return;
        
        // Player movement
        let moveX = 0, moveY = 0;
        
        // Joystick input
        if (this.joystickActive) {
            moveX = Math.cos(this.joystickAngle) * this.joystickDistance / 30 * this.player.speed;
            moveY = Math.sin(this.joystickAngle) * this.joystickDistance / 30 * this.player.speed;
        } else {
            // Keyboard input (for desktop)
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= this.player.speed;
            if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += this.player.speed;
            if (this.keys['KeyW'] || this.keys['ArrowUp']) moveY -= this.player.speed;
            if (this.keys['KeyS'] || this.keys['ArrowDown']) moveY += this.player.speed;
        }
        
        this.player.x = Math.max(this.player.width/2, Math.min(this.canvas.width - this.player.width/2, 
            this.canvas.width/2 + moveX));
        this.player.y = Math.max(this.player.height/2, Math.min(this.canvas.height - this.player.height/2, 
            this.canvas.height/2 + moveY));
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.life--;
            return bullet.life > 0 && 
                   bullet.x > -10 && bullet.x < this.canvas.width + 10 &&
                   bullet.y > -10 && bullet.y < this.canvas.height + 10;
        });
        
        // Update zombies
        this.zombies.forEach(zombie => {
            const dx = this.canvas.width/2 - zombie.x;
            const dy = this.canvas.height/2 - zombie.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            if (distance > 0) {
                zombie.vx = (dx / distance) * zombie.speed;
                zombie.vy = (dy / distance) * zombie.speed;
            }
            zombie.x += zombie.vx;
            zombie.y += zombie.vy;
            
            // Zombie-player collision
            const dxPlayer = this.canvas.width/2 - zombie.x;
            const dyPlayer = this.canvas.height/2 - zombie.y;
            const distPlayer = Math.sqrt(dxPlayer*dxPlayer + dyPlayer*dyPlayer);
            if (distPlayer < zombie.size + 20) {
                this.takeDamage(1);
            }
        });
        
        // Bullet-zombie collision
        this.bullets.forEach((bullet, bIdx) => {
            this.zombies.forEach((zombie, zIdx) => {
                const dx = bullet.x - zombie.x;
                const dy = bullet.y - zombie.y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                if (distance < zombie.size) {
                    this.killZombie(zIdx);
                    this.bullets.splice(bIdx, 1);
                    this.createExplosion(zombie.x, zombie.y);
                }
            });
        });
        
        // Coin collection
        this.coinsList.forEach((coin, idx) => {
            const dx = this.canvas.width/2 - coin.x;
            const dy = this.canvas.height/2 - coin.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 40) {
                this.coins += 10;
                this.coinsList.splice(idx, 1);
                this.updateUI();
            }
        });
        
        // Spawn zombies
        this.spawnTimer += deltaTime;
        if (this.spawnTimer > 1000 - Math.min(this.score * 0.1, 500)) {
            this.spawnZombie();
            this.spawnTimer = 0;
        }
        
        // Update cooldowns
        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);
        
        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vy += 0.1; // gravity
            return p.life > 0;
        });
        
        this.updateUI();
        
        if (this.health <= 0) {
            this.gameOver();
        }
    }
    
    spawnZombie() {
        const side = Math.floor(Math.random() * 4);
        let x, y, vx = 0, vy = 0;
        
        switch(side) {
            case 0: // top
                x = Math.random() * this.canvas.width;
                y = -50;
                break;
            case 1: // right
                x = this.canvas.width + 50;
                y = Math.random() * this.canvas.height;
                break;
            case 2: // bottom
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + 50;
                break;
            case 3: // left
                x = -50;
                y = Math.random() * this.canvas.height;
                break;
        }
        
        const speed = 0.5 + Math.min(this.score * 0.001, 2);
        this.zombies.push({
            x, y, vx, vy,
            speed,
            size: 25 + Math.random() * 15,
            health: 1
        });
    }
    
    killZombie(index) {
        const zombie = this.zombies[index];
        this.score += 100;
        if (Math.random() < 0.3) {
            this.coinsList.push({
                x: zombie.x,
                y: zombie.y,
                size: 8,
                spin: 0
            });
        }
        this.zombies.splice(index, 1);
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.createDamageEffect();
    }
    
    createShootEffect(angle) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.canvas.width/2,
                y: this.canvas.height/2,
                vx: Math.cos(angle) * (3 + Math.random() * 3) + (Math.random() - 0.5) * 2,
                vy: Math.sin(angle) * (3 + Math.random() * 3) + (Math.random() - 0.5) * 2,
                life: 20,
                color: '#ffff00'
            });
        }
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30 + Math.random() * 20,
                color: `hsl(${Math.random() * 60 + 10}, 100%, 50%)`
            });
        }
    }
    
    createDamageEffect() {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: this.canvas.width/2,
                y: this.canvas.height/2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 25,
                color: '#ff0000'
            });
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('coins').textContent = this.coins;
        document.getElementById('healthBar').style.width = Math.max(0, this.health) + '%';
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Fog effect
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width/2, this.canvas.height/2, 0,
            this.canvas.width/2, this.canvas.height/2, Math.max(this.canvas.width, this.canvas.height)/2
        );
        gradient.addColorStop(0, 'rgba(0, 20, 40, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render player (always center)
        this.ctx.save();
        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
        
        // Player body
        this.ctx.fillStyle = '#00ff00';
        this.ctx.shadowColor = '#00ff00';
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.player.width/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Player eye
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(8, -5, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
        
        // Render bullets
        this.bullets.forEach(bullet => {
            this.ctx.save();
            this.ctx.translate(bullet.x, bullet.y);
            this.ctx.fillStyle = '#ffff00';
            this.ctx.shadowColor = '#ffff00';
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Render zombies
        this.zombies.forEach(zombie => {
            this.ctx.save();
            this.ctx.translate(zombie.x, zombie.y);
            
            // Zombie glow
            this.ctx.shadowColor = '#ff0000';
            this.ctx.shadowBlur = 15;
            
            // Zombie body
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, zombie.size);
            gradient.addColorStop(0, '#660000');
            gradient.addColorStop(1, '#330000');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, zombie.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Zombie eyes
            this.ctx.fillStyle = '#ff0000';
            this.ctx.beginPath();
            this.ctx.arc(-8, -5, 4, 0, Math.PI * 2);
            this.ctx.arc(8, -5, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
        
        // Render coins
        this.coinsList.forEach(coin => {
            this.ctx.save();
            this.ctx.translate(coin.x, coin.y);
            this.ctx.rotate(coin.spin);
            
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coin.size);
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(1, '#ffaa00');
            this.ctx.shadowColor = '#ffff00';
            this.ctx.shadowBlur = 20;
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            coin.spin += 0.2;
            this.ctx.restore();
        });
        
        // Render particles
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life / 50;
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    gameOver() {
        this.gameRunning = false;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalCoins').textContent = this.coins;
        document.getElementById('gameOverScreen').classList.add('active');
    }
    
    restart() {
        this.gameRunning = true;
        this.score = 0;
        this.coins = 0;
        this.health = 100;
        this.bullets = [];
        this.zombies = [];
        this.particles = [];
        this.coinsList = [];
        this.spawnTimer = 0;
        document.getElementById('gameOverScreen').classList.remove('active');
        this.updateUI();
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = Math.min(currentTime - this.lastTime, 16);
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Initialize game
const game = new Game();

// Restart button
document.getElementById('restartBtn').addEventListener('click', () => {
    game.restart();
});

// Prevent scrolling on mobile
document.addEventListener('touchmove', (e) => {
    if (e.target === document.body) {
        e.preventDefault();
    }
}, { passive: false });
