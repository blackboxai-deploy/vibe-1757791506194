"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Game configuration
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;
const INITIAL_SPEED = 150; // milliseconds
const SPEED_INCREASE = 10; // decrease interval by this amount per level
const MIN_SPEED = 50;

// Direction vectors
const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

type Direction = keyof typeof DIRECTIONS;
type GameState = "menu" | "playing" | "paused" | "gameOver";
type Position = { x: number; y: number };

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastMoveTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Game state
  const [gameState, setGameState] = useState<GameState>("menu");
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [level, setLevel] = useState(1);

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.log("Audio not supported");
      }
      
      // Load high score from localStorage
      const savedHighScore = localStorage.getItem("snakeHighScore");
      if (savedHighScore) {
        setHighScore(parseInt(savedHighScore));
      }
    }
  }, []);

  // Play sound effect
  const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = "square") => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (error) {
      // Silent fail for audio errors
    }
  }, []);

  // Generate random food position
  const generateFood = useCallback((snakePositions: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snakePositions.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // Check collision with walls or self
  const checkCollision = useCallback((head: Position, body: Position[]): boolean => {
    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    // Self collision
    return body.some(segment => segment.x === head.x && segment.y === head.y);
  }, []);

  // Move snake
  const moveSnake = useCallback(() => {
    if (gameState !== "playing") return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };
      const dir = DIRECTIONS[direction];
      
      head.x += dir.x;
      head.y += dir.y;

      // Check collisions
      if (checkCollision(head, newSnake)) {
        setGameState("gameOver");
        playSound(150, 0.5, "sawtooth");
        
        // Update high score
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem("snakeHighScore", score.toString());
        }
        return prevSnake;
      }

      newSnake.unshift(head);

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        const newScore = score + 1;
        setScore(newScore);
        setFood(generateFood(newSnake));
        playSound(800, 0.1);
        
        // Increase speed and level
        const newLevel = Math.floor(newScore / 5) + 1;
        if (newLevel !== level) {
          setLevel(newLevel);
          const newSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - (newLevel - 1) * SPEED_INCREASE);
          setSpeed(newSpeed);
        }
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [gameState, direction, food, score, level, highScore, checkCollision, generateFood, playSound]);

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    if (gameState === "playing" && currentTime - lastMoveTimeRef.current >= speed) {
      moveSnake();
      lastMoveTimeRef.current = currentTime;
    }
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, speed, moveSnake]);

  // Start game loop
  useEffect(() => {
    if (gameState === "playing") {
      lastMoveTimeRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE);
      ctx.stroke();
    }

     // Draw Snake Torpedo with modern textures
    snake.forEach((segment, index) => {
      const x = segment.x * CELL_SIZE + 1;
      const y = segment.y * CELL_SIZE + 1;
      const width = CELL_SIZE - 2;
      const height = CELL_SIZE - 2;
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      
      if (index === 0) {
        // Draw Torpedo Head with modern design
        const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
        gradient.addColorStop(0, "#1E40AF"); // Deep blue
        gradient.addColorStop(0.3, "#3B82F6"); // Medium blue
        gradient.addColorStop(0.7, "#60A5FA"); // Light blue
        gradient.addColorStop(1, "#93C5FD"); // Very light blue
        
        // Main torpedo head shape (rounded rectangle)
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 8);
        ctx.fill();
        
        // Add metallic border
        ctx.strokeStyle = "#1E3A8A";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add torpedo nose cone based on direction
        ctx.fillStyle = "#0F172A"; // Dark nose
        switch (direction) {
          case "RIGHT":
            ctx.beginPath();
            ctx.moveTo(x + width, centerY);
            ctx.lineTo(x + width - 6, centerY - 4);
            ctx.lineTo(x + width - 6, centerY + 4);
            ctx.closePath();
            ctx.fill();
            break;
          case "LEFT":
            ctx.beginPath();
            ctx.moveTo(x, centerY);
            ctx.lineTo(x + 6, centerY - 4);
            ctx.lineTo(x + 6, centerY + 4);
            ctx.closePath();
            ctx.fill();
            break;
          case "UP":
            ctx.beginPath();
            ctx.moveTo(centerX, y);
            ctx.lineTo(centerX - 4, y + 6);
            ctx.lineTo(centerX + 4, y + 6);
            ctx.closePath();
            ctx.fill();
            break;
          case "DOWN":
            ctx.beginPath();
            ctx.moveTo(centerX, y + height);
            ctx.lineTo(centerX - 4, y + height - 6);
            ctx.lineTo(centerX + 4, y + height - 6);
            ctx.closePath();
            ctx.fill();
            break;
        }
        
        // Add torpedo lights/sensors
        ctx.fillStyle = "#00FF88"; // Bright green lights
        const lightSize = 2;
        switch (direction) {
          case "RIGHT":
            ctx.fillRect(x + width - 8, centerY - 3, lightSize, lightSize);
            ctx.fillRect(x + width - 8, centerY + 1, lightSize, lightSize);
            break;
          case "LEFT":
            ctx.fillRect(x + 6, centerY - 3, lightSize, lightSize);
            ctx.fillRect(x + 6, centerY + 1, lightSize, lightSize);
            break;
          case "UP":
            ctx.fillRect(centerX - 3, y + 6, lightSize, lightSize);
            ctx.fillRect(centerX + 1, y + 6, lightSize, lightSize);
            break;
          case "DOWN":
            ctx.fillRect(centerX - 3, y + height - 8, lightSize, lightSize);
            ctx.fillRect(centerX + 1, y + height - 8, lightSize, lightSize);
            break;
        }
        
        // Add center command module
        ctx.fillStyle = "#1F2937";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = "#00FFFF"; // Cyan center light
        ctx.beginPath();
        ctx.arc(centerX, centerY, 1.5, 0, 2 * Math.PI);
        ctx.fill();
        
      } else {
        // Draw Torpedo Body Segments
        const segmentDistance = snake.length - index;
        const intensity = Math.max(0.3, 1 - (segmentDistance * 0.1));
        
        // Create gradient for body segments
        const bodyGradient = ctx.createLinearGradient(x, y, x + width, y + height);
        bodyGradient.addColorStop(0, `rgba(59, 130, 246, ${intensity})`); // Blue
        bodyGradient.addColorStop(0.5, `rgba(96, 165, 250, ${intensity * 0.8})`); // Lighter blue
        bodyGradient.addColorStop(1, `rgba(147, 197, 253, ${intensity * 0.6})`); // Even lighter
        
        // Main body segment
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 4);
        ctx.fill();
        
        // Add segment border
        ctx.strokeStyle = `rgba(30, 58, 138, ${intensity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Add body segment details
        if (index % 2 === 0) {
          // Add alternating segment rings
          ctx.strokeStyle = `rgba(15, 23, 42, ${intensity * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 2, centerY);
          ctx.lineTo(x + width - 2, centerY);
          ctx.stroke();
        }
        
        // Add energy flow lines
        if (index % 3 === 0) {
          ctx.strokeStyle = `rgba(0, 255, 136, ${intensity * 0.3})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 3);
          ctx.lineTo(x + width - 3, y + height - 3);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + width - 3, y + 3);
          ctx.lineTo(x + 3, y + height - 3);
          ctx.stroke();
        }
        
        // Add thruster effect to last segment
        if (index === snake.length - 1) {
          // Determine thruster direction (opposite to snake movement)
          let thrusterX, thrusterY, thrusterWidth, thrusterHeight;
          
          switch (direction) {
            case "RIGHT":
              thrusterX = x - 4;
              thrusterY = centerY - 2;
              thrusterWidth = 4;
              thrusterHeight = 4;
              break;
            case "LEFT":
              thrusterX = x + width;
              thrusterY = centerY - 2;
              thrusterWidth = 4;
              thrusterHeight = 4;
              break;
            case "UP":
              thrusterX = centerX - 2;
              thrusterY = y + height;
              thrusterWidth = 4;
              thrusterHeight = 4;
              break;
            case "DOWN":
              thrusterX = centerX - 2;
              thrusterY = y - 4;
              thrusterWidth = 4;
              thrusterHeight = 4;
              break;
          }
          
          // Draw thruster flame
          const thrusterGradient = ctx.createRadialGradient(
            thrusterX + thrusterWidth/2, thrusterY + thrusterHeight/2, 0,
            thrusterX + thrusterWidth/2, thrusterY + thrusterHeight/2, thrusterWidth/2
          );
          thrusterGradient.addColorStop(0, "#00FFFF");
          thrusterGradient.addColorStop(0.5, "#0080FF");
          thrusterGradient.addColorStop(1, "#0040FF");
          
          ctx.fillStyle = thrusterGradient;
          ctx.beginPath();
          ctx.arc(thrusterX + thrusterWidth/2, thrusterY + thrusterHeight/2, thrusterWidth/2, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    });

     // Draw Energy Core (food)
    const coreX = food.x * CELL_SIZE + CELL_SIZE / 2;
    const coreY = food.y * CELL_SIZE + CELL_SIZE / 2;
    const coreRadius = (CELL_SIZE - 4) / 2;
    
    // Outer energy field (pulsing effect)
    const time = Date.now() * 0.005;
    const pulseRadius = coreRadius + Math.sin(time) * 2;
    const energyGradient = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, pulseRadius);
    energyGradient.addColorStop(0, "rgba(255, 0, 128, 0.8)");
    energyGradient.addColorStop(0.5, "rgba(255, 64, 192, 0.4)");
    energyGradient.addColorStop(1, "rgba(255, 128, 255, 0.1)");
    
    ctx.fillStyle = energyGradient;
    ctx.beginPath();
    ctx.arc(coreX, coreY, pulseRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Main energy core body
    const coreGradient = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreRadius);
    coreGradient.addColorStop(0, "#FF0080");
    coreGradient.addColorStop(0.3, "#FF4080");
    coreGradient.addColorStop(0.7, "#FF8080");
    coreGradient.addColorStop(1, "#FF4060");
    
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(coreX, coreY, coreRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Core border
    ctx.strokeStyle = "#800040";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Inner energy pattern
    ctx.fillStyle = "#FFFF80";
    ctx.beginPath();
    ctx.arc(coreX, coreY, coreRadius * 0.6, 0, 2 * Math.PI);
    ctx.fill();
    
    // Core center
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(coreX, coreY, coreRadius * 0.3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add rotating energy spikes
    ctx.strokeStyle = "#00FFFF";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI / 4) + (time * 2);
      const spikeLength = coreRadius + 3;
      const startX = coreX + Math.cos(angle) * (coreRadius - 2);
      const startY = coreY + Math.sin(angle) * (coreRadius - 2);
      const endX = coreX + Math.cos(angle) * spikeLength;
      const endY = coreY + Math.sin(angle) * spikeLength;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

  }, [snake, food, direction]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      
      if (gameState === "menu" && (e.code === "Space" || e.code === "Enter")) {
        startGame();
        return;
      }
      
      if (gameState === "gameOver" && e.code === "KeyR") {
        resetGame();
        return;
      }
      
      if (gameState === "playing" || gameState === "paused") {
        switch (e.code) {
          case "Space":
            togglePause();
            break;
          case "KeyR":
            resetGame();
            break;
          case "ArrowUp":
          case "KeyW":
            if (direction !== "DOWN") setDirection("UP");
            break;
          case "ArrowDown":
          case "KeyS":
            if (direction !== "UP") setDirection("DOWN");
            break;
          case "ArrowLeft":
          case "KeyA":
            if (direction !== "RIGHT") setDirection("LEFT");
            break;
          case "ArrowRight":
          case "KeyD":
            if (direction !== "LEFT") setDirection("RIGHT");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState, direction]);

  const startGame = () => {
    setGameState("playing");
    playSound(440, 0.1);
  };

  const togglePause = () => {
    if (gameState === "playing") {
      setGameState("paused");
    } else if (gameState === "paused") {
      setGameState("playing");
    }
  };

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection("RIGHT");
    setFood({ x: 15, y: 15 });
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setLevel(1);
    setGameState("playing");
    playSound(660, 0.1);
  };

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* Enhanced Game Stats */}
      <div className="grid grid-cols-4 gap-6 w-full max-w-2xl">
         <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl px-4 py-3 border border-cyan-500 shadow-lg">
          <div className="text-white text-2xl font-bold">{score}</div>
          <div className="text-cyan-100 text-xs font-medium flex items-center">
            <span className="mr-1">⚡</span>ENERGY
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl px-4 py-3 border border-blue-500 shadow-lg">
          <div className="text-white text-2xl font-bold">{highScore}</div>
          <div className="text-blue-100 text-xs font-medium flex items-center">
            <span className="mr-1">🏆</span>RECORD
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl px-4 py-3 border border-purple-500 shadow-lg">
          <div className="text-white text-2xl font-bold">{level}</div>
          <div className="text-purple-100 text-xs font-medium flex items-center">
            <span className="mr-1">🚀</span>BOOST
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl px-4 py-3 border border-orange-500 shadow-lg">
          <div className="text-white text-2xl font-bold">{snake.length}</div>
          <div className="text-orange-100 text-xs font-medium flex items-center">
            <span className="mr-1">🔧</span>SIZE
          </div>
        </div>
      </div>

      {/* Game Canvas with Enhanced Border */}
      <div className="relative">
        <div className="absolute -inset-2 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-xl blur opacity-30 animate-pulse"></div>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="relative border-4 border-gray-700 rounded-xl bg-gray-900 shadow-2xl"
        />
        
        {/* Enhanced Game State Overlays */}
        {gameState === "menu" && (
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black bg-opacity-90 flex items-center justify-center rounded-xl backdrop-blur-sm">
            <div className="text-center bg-gray-800 bg-opacity-50 p-8 rounded-2xl border border-gray-600">
              <div className="text-6xl mb-4 animate-bounce">🚀</div>
               <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">Initialize Torpedo?</h2>
              <p className="text-gray-300 mb-2 text-lg">Navigate the depths and collect energy cores!</p>
              <p className="text-gray-400 mb-8">Press SPACE or ENTER to launch your torpedo mission</p>
              <div className="flex justify-center space-x-4">
                <div className="animate-pulse text-cyan-400 text-2xl">🎮</div>
                <div className="animate-pulse text-pink-400 text-2xl">⚡</div>
                <div className="animate-pulse text-blue-400 text-2xl">🚀</div>
              </div>
            </div>
          </div>
        )}
        
        {gameState === "paused" && (
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black bg-opacity-90 flex items-center justify-center rounded-xl backdrop-blur-sm">
            <div className="text-center bg-gray-800 bg-opacity-50 p-8 rounded-2xl border border-gray-600">
              <div className="text-6xl mb-4">⏸️</div>
               <h2 className="text-4xl font-bold text-yellow-400 mb-4">TORPEDO SUSPENDED</h2>
              <p className="text-gray-300 text-lg">Systems on standby, torpedo awaits commands!</p>
              <p className="text-gray-400 mt-2">Press SPACE to resume navigation</p>
            </div>
          </div>
        )}
        
        {gameState === "gameOver" && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-gray-900 to-black bg-opacity-95 flex items-center justify-center rounded-xl backdrop-blur-sm">
            <div className="text-center bg-gray-800 bg-opacity-50 p-8 rounded-2xl border border-red-600">
              <div className="text-6xl mb-4 animate-bounce">💀</div>
               <h2 className="text-4xl font-bold text-red-400 mb-4">TORPEDO DESTROYED</h2>
              <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-700">
                <p className="text-gray-300 mb-2 text-lg">Energy Collected: <span className="text-cyan-400 font-bold text-2xl">{score}</span> ⚡</p>
                <p className="text-gray-400">Torpedo Size: <span className="text-orange-400 font-semibold">{snake.length}</span> segments</p>
                <p className="text-gray-400">Boost Level: <span className="text-purple-400 font-semibold">{level}</span></p>
              </div>
              {score === highScore && score > 0 && (
                <div className="mb-4">
                  <p className="text-2xl text-yellow-400 mb-2 animate-pulse">🏆 NEW HIGH SCORE! 🏆</p>
                  <p className="text-yellow-300">Congratulations on your achievement!</p>
                </div>
              )}
              <p className="text-gray-400 mb-6">Press R to challenge yourself again</p>
              <div className="flex justify-center space-x-4">
                <div className="animate-bounce text-red-400 text-2xl">💥</div>
                <div className="animate-pulse text-gray-400 text-2xl">😵</div>
                <div className="animate-bounce text-red-400 text-2xl">💥</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Game Controls */}
      <div className="flex flex-wrap justify-center gap-4">
        {gameState === "menu" && (
          <button
            onClick={startGame}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200 border border-green-400"
          >
            <span className="mr-2">🚀</span>Start Game
          </button>
        )}
        
        {(gameState === "playing" || gameState === "paused") && (
          <>
            <button
              onClick={togglePause}
              className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200 border border-yellow-400"
            >
              <span className="mr-2">{gameState === "paused" ? "▶️" : "⏸️"}</span>
              {gameState === "paused" ? "Resume" : "Pause"}
            </button>
            <button
              onClick={resetGame}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200 border border-blue-400"
            >
              <span className="mr-2">🔄</span>Restart
            </button>
          </>
        )}
        
        {gameState === "gameOver" && (
          <button
            onClick={resetGame}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200 border border-green-400 animate-pulse"
          >
            <span className="mr-2">🎮</span>Play Again
          </button>
        )}
      </div>
      
      {/* Enhanced Speed Indicator */}
      <div className="text-center bg-gray-800 rounded-xl p-4 border border-gray-600 w-full max-w-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-300 font-medium">🚄 Speed</span>
          <span className="text-white font-bold">{Math.round((1000 / speed) * 10) / 10} moves/sec</span>
        </div>
        <div className="relative">
          <div className="w-full bg-gray-700 rounded-full h-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 h-3 rounded-full transition-all duration-500 shadow-lg relative overflow-hidden"
              style={{
                width: `${Math.min(100, ((INITIAL_SPEED - speed) / (INITIAL_SPEED - MIN_SPEED)) * 100)}%`,
              }}
            >
              <div className="absolute inset-0 bg-white bg-opacity-20 animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Slow</span>
            <span>Lightning ⚡</span>
          </div>
        </div>
      </div>
    </div>
  );
}