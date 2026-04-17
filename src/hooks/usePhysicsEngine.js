import { useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';
import { BALLS, PHYSICS_CONFIG } from '../constants/gameConstants';

const { Engine, Runner, Bodies, Body, World, Events } = Matter;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function usePhysicsEngine({ canvasRef, onMerge, onGameOver, onBallAdded, activeSkin }) {
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const ballsRef = useRef([]);
  const mergingRef = useRef(new Set());
  const isRunningRef = useRef(false);
  const animFrameRef = useRef(null);
  const onMergeRef = useRef(onMerge);
  const onGameOverRef = useRef(onGameOver);
  const dangerStartedAtRef = useRef(null);
  const graceUntilRef = useRef(0);
  const collisionCleanupRef = useRef([]);

  useEffect(() => {
    onMergeRef.current = onMerge;
  }, [onMerge]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  const drawBall = useCallback((ctx, body, ballData, skin) => {
    const { x, y } = body.position;
    const radius = ballData.radius;
    const angle = body.angle;
    const fill1 = skin?.colors?.[ballData.level - 1] || ballData.gradient[0];
    const fill2 = ballData.gradient[1];
    const glow = skin?.glow || ballData.glowColor;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.shadowBlur = 12 + ballData.level * 0.8;
    ctx.shadowColor = glow;

    const gradient = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, radius * 0.1, 0, 0, radius);
    gradient.addColorStop(0, fill1);
    gradient.addColorStop(1, fill2);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(-radius * 0.22, -radius * 0.24, radius * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();

    ctx.font = `${Math.max(10, Math.round(radius * 1.05))}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try {
      ctx.fillText(ballData.emoji, 0, radius * 0.02);
    } catch {}

    ctx.restore();
  }, []);

  const renderLoop = useCallback((canvas, skin) => {
    const ctx = canvas.getContext('2d');

    function gameLoop() {
      if (!isRunningRef.current || !engineRef.current) return;
      animFrameRef.current = requestAnimationFrame(gameLoop);

      const width = canvas.width;
      const height = canvas.height;
      const dangerY = height * PHYSICS_CONFIG.dangerLineRatio;

      ctx.clearRect(0, 0, width, height);

      const overlay = ctx.createLinearGradient(0, 0, 0, height);
      overlay.addColorStop(0, 'rgba(18, 31, 64, 0.18)');
      overlay.addColorStop(1, 'rgba(7, 12, 28, 0.04)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.setLineDash([7, 7]);
      ctx.strokeStyle = 'rgba(255, 194, 102, 0.28)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(8, dangerY);
      ctx.lineTo(width - 8, dangerY);
      ctx.stroke();
      ctx.restore();

      const wallGlow = ctx.createLinearGradient(0, 0, 10, 0);
      wallGlow.addColorStop(0, 'rgba(140, 196, 255, 0.36)');
      wallGlow.addColorStop(1, 'rgba(140, 196, 255, 0)');
      ctx.fillStyle = wallGlow;
      ctx.fillRect(0, 0, 10, height);

      const wallGlowRight = ctx.createLinearGradient(width - 10, 0, width, 0);
      wallGlowRight.addColorStop(0, 'rgba(140, 196, 255, 0)');
      wallGlowRight.addColorStop(1, 'rgba(140, 196, 255, 0.36)');
      ctx.fillStyle = wallGlowRight;
      ctx.fillRect(width - 10, 0, 10, height);

      ballsRef.current.forEach((entry) => {
        if (!entry?.body || entry.body.isStatic) return;
        const ballData = BALLS[entry.level - 1];
        if (ballData) drawBall(ctx, entry.body, ballData, skin);
      });
    }

    requestAnimationFrame(gameLoop);
  }, [drawBall]);

  const removeAllDynamicBalls = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    ballsRef.current.forEach((entry) => {
      if (entry?.body) World.remove(engine.world, entry.body);
    });
    ballsRef.current = [];
    mergingRef.current.clear();
  }, []);

  const createBallBody = useCallback((x, y, level, velocity = { x: 0, y: 0 }) => {
    const ball = BALLS[level - 1];
    if (!ball) return null;

    const body = Bodies.circle(x, y, ball.radius, {
      restitution: PHYSICS_CONFIG.ballRestitution,
      friction: PHYSICS_CONFIG.ballFriction,
      frictionAir: PHYSICS_CONFIG.ballFrictionAir,
      density: PHYSICS_CONFIG.ballDensity,
      sleepThreshold: PHYSICS_CONFIG.sleepThreshold,
      label: `ball_${level}`,
    });

    Body.setVelocity(body, velocity);
    return body;
  }, []);

  const initEngine = useCallback((canvas, skin) => {
    if (engineRef.current) return;

    const engine = Engine.create({
      gravity: PHYSICS_CONFIG.gravity,
      enableSleeping: true,
    });

    engine.positionIterations = 8;
    engine.velocityIterations = 6;
    engine.constraintIterations = 2;

    engineRef.current = engine;
    dangerStartedAtRef.current = null;
    graceUntilRef.current = performance.now() + 1000;

    const width = canvas.width;
    const height = canvas.height;
    const thickness = PHYSICS_CONFIG.wallThickness;

    const floor = Bodies.rectangle(width / 2, height + thickness / 2, width + thickness * 2, thickness, {
      isStatic: true,
      label: 'floor',
      restitution: 0.06,
      friction: 0.25,
    });

    const leftWall = Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 2, {
      isStatic: true,
      label: 'wall-left',
      restitution: 0.1,
      friction: 0.02,
    });

    const rightWall = Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 2, {
      isStatic: true,
      label: 'wall-right',
      restitution: 0.1,
      friction: 0.02,
    });

    World.add(engine.world, [floor, leftWall, rightWall]);

    const runner = Runner.create({ delta: PHYSICS_CONFIG.engineTimestep });
    runnerRef.current = runner;
    Runner.run(runner, engine);

    const collisionHandler = Events.on(engine, 'collisionStart', (event) => {
      const merges = [];

      event.pairs.forEach(({ bodyA, bodyB }) => {
        if (!bodyA || !bodyB || bodyA.isStatic || bodyB.isStatic) return;

        const entryA = ballsRef.current.find((item) => item?.body === bodyA);
        const entryB = ballsRef.current.find((item) => item?.body === bodyB);

        if (!entryA || !entryB || entryA.level !== entryB.level || entryA.level >= BALLS.length) return;

        const key = [Math.min(bodyA.id, bodyB.id), Math.max(bodyA.id, bodyB.id)].join('-');
        if (mergingRef.current.has(key)) return;

        mergingRef.current.add(key);
        merges.push({ entryA, entryB, key });
      });

      merges.forEach(({ entryA, entryB, key }) => {
        const position = {
          x: (entryA.body.position.x + entryB.body.position.x) / 2,
          y: (entryA.body.position.y + entryB.body.position.y) / 2,
        };
        const newLevel = entryA.level + 1;
        const newBall = BALLS[newLevel - 1];
        if (!newBall) return;

        World.remove(engine.world, entryA.body);
        World.remove(engine.world, entryB.body);
        ballsRef.current = ballsRef.current.filter((entry) => entry !== entryA && entry !== entryB);

        const mergedBody = createBallBody(position.x, position.y, newLevel, { x: 0, y: -2.6 });
        if (!mergedBody) return;
        World.add(engine.world, mergedBody);
        ballsRef.current.push({ body: mergedBody, level: newLevel });

        onMergeRef.current?.({
          level: newLevel,
          score: newBall.score,
          x: position.x,
          y: position.y,
        });

        const cleanup = setTimeout(() => mergingRef.current.delete(key), 220);
        collisionCleanupRef.current.push(cleanup);
      });
    });

    const updateHandler = Events.on(engine, 'afterUpdate', () => {
      if (!isRunningRef.current) return;
      const dangerY = canvas.height * PHYSICS_CONFIG.dangerLineRatio;
      const now = performance.now();

      if (now < graceUntilRef.current) {
        dangerStartedAtRef.current = null;
        return;
      }

      const inDanger = ballsRef.current.some((entry) => {
        if (!entry?.body || entry.body.isStatic) return false;
        const radius = BALLS[entry.level - 1]?.radius || 10;
        const speed = Math.abs(entry.body.velocity.x) + Math.abs(entry.body.velocity.y);
        return entry.body.position.y - radius < dangerY && speed < 0.3;
      });

      if (!inDanger) {
        dangerStartedAtRef.current = null;
        return;
      }

      if (!dangerStartedAtRef.current) {
        dangerStartedAtRef.current = now;
        return;
      }

      if (now - dangerStartedAtRef.current > 1200) {
        isRunningRef.current = false;
        onGameOverRef.current?.();
      }
    });

    isRunningRef.current = true;
    renderLoop(canvas, skin);

    return () => {
      Matter.Events.off(engine, 'collisionStart', collisionHandler);
      Matter.Events.off(engine, 'afterUpdate', updateHandler);
    };
  }, [createBallBody, renderLoop]);

  const dropBall = useCallback((x, level, options = {}) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas || !isRunningRef.current) return false;

    if (ballsRef.current.length >= PHYSICS_CONFIG.maxBodies) {
      const removable = [...ballsRef.current].sort((a, b) => a.level - b.level || a.body.position.y - b.body.position.y)[0];
      if (removable) {
        World.remove(engine.world, removable.body);
        ballsRef.current = ballsRef.current.filter((entry) => entry !== removable);
      }
    }

    const ballData = BALLS[level - 1];
    if (!ballData) return false;

    const clampedX = clamp(x, ballData.radius + 8, canvas.width - ballData.radius - 8);
    const spawnY = Math.max(ballData.radius + 10, canvas.height * 0.08);

    const body = createBallBody(clampedX, spawnY, level, {
      x: options.vx ?? 0,
      y: options.vy ?? 1.4,
    });
    if (!body) return false;

    World.add(engine.world, body);
    ballsRef.current.push({ body, level });
    onBallAdded?.();
    graceUntilRef.current = Math.max(graceUntilRef.current, performance.now() + 180);
    return true;
  }, [canvasRef, createBallBody, onBallAdded]);

  const serializeState = useCallback(() => ({
    balls: ballsRef.current.map((entry) => ({
      level: entry.level,
      x: entry.body.position.x,
      y: entry.body.position.y,
      vx: entry.body.velocity.x,
      vy: entry.body.velocity.y,
      angle: entry.body.angle,
      angularVelocity: entry.body.angularVelocity,
    })),
  }), []);

  const restoreState = useCallback((snapshot, options = {}) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas || !snapshot?.balls?.length) return false;

    removeAllDynamicBalls();

    const dangerY = canvas.height * PHYSICS_CONFIG.dangerLineRatio;
    let savedBalls = [...snapshot.balls];

    if (options.revive) {
      const removeCount = Math.min(4, Math.max(2, Math.floor(savedBalls.length * 0.18)));
      savedBalls.sort((a, b) => a.y - b.y);
      savedBalls = savedBalls.slice(removeCount);

      let minTop = Infinity;
      savedBalls.forEach((item) => {
        const radius = BALLS[item.level - 1]?.radius || 10;
        minTop = Math.min(minTop, item.y - radius);
      });

      const shift = Number.isFinite(minTop) ? Math.max(0, dangerY + 54 - minTop) : 0;
      savedBalls = savedBalls.map((item) => {
        const radius = BALLS[item.level - 1]?.radius || 10;
        return {
          ...item,
          y: clamp(item.y + shift, radius + 10, canvas.height - radius - 10),
          vy: 0,
          vx: item.vx * 0.2,
        };
      });
      graceUntilRef.current = performance.now() + 2200;
    }

    savedBalls.forEach((item) => {
      const body = createBallBody(item.x, item.y, item.level, { x: item.vx || 0, y: item.vy || 0 });
      if (!body) return;
      Body.setAngle(body, item.angle || 0);
      Body.setAngularVelocity(body, item.angularVelocity || 0);
      World.add(engine.world, body);
      ballsRef.current.push({ body, level: item.level });
    });

    return true;
  }, [canvasRef, createBallBody, removeAllDynamicBalls]);

  const removeLowestBalls = useCallback((count = 3) => {
    const engine = engineRef.current;
    if (!engine || !ballsRef.current.length) return 0;

    const targets = [...ballsRef.current]
      .sort((a, b) => a.level - b.level || a.body.position.y - b.body.position.y)
      .slice(0, count);

    targets.forEach((entry) => World.remove(engine.world, entry.body));
    ballsRef.current = ballsRef.current.filter((entry) => !targets.includes(entry));
    graceUntilRef.current = performance.now() + 350;
    return targets.length;
  }, []);

  const resetEngine = useCallback(() => {
    dangerStartedAtRef.current = null;
    graceUntilRef.current = performance.now() + 1000;
    removeAllDynamicBalls();
  }, [removeAllDynamicBalls]);

  const destroyEngine = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (runnerRef.current) Runner.stop(runnerRef.current);
    collisionCleanupRef.current.forEach((timer) => clearTimeout(timer));
    collisionCleanupRef.current = [];
    if (engineRef.current) Engine.clear(engineRef.current);
    ballsRef.current = [];
    mergingRef.current.clear();
    engineRef.current = null;
    runnerRef.current = null;
  }, []);

  return {
    initEngine,
    dropBall,
    resetEngine,
    destroyEngine,
    serializeState,
    restoreState,
    removeLowestBalls,
    ballsRef,
    isRunningRef,
  };
}
