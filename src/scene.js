import * as THREE from 'three';

const COLORS = {
  pink: '#f5a4b5',
  lightPink: '#ffd0d7',
  rose: '#e67e98',
  coral: '#ef6f77',
  cream: '#fff4df',
  butter: '#f8d787',
  mint: '#a8cbb3',
  dark: '#583c44',
};

/** Mount a self-contained, transparent decorative scene. WebGL failures propagate. */
export function mountScene(container, mode = 'pig') {
  if (!container || typeof container.appendChild !== 'function') {
    throw new TypeError('mountScene requires a DOM container.');
  }

  const isRoute = mode === 'route';
  const scene = new THREE.Scene();
  const geometries = new Set();
  const materials = new Set();
  const geometryCache = new Map();
  const materialCache = new Map();
  const moving = [];
  let renderer;
  let observer;
  let media;
  let frame = 0;
  let destroyed = false;
  let visible = true;
  let hasSize = false;
  let reducedMotion = false;
  let lastTime = null;
  let elapsed = 0;
  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 80);
  const viewTarget = new THREE.Vector3(0, isRoute ? 0.25 : 1.62, 0);

  function geometry(key, create) {
    if (!geometryCache.has(key)) {
      const value = create();
      geometries.add(value);
      geometryCache.set(key, value);
    }
    return geometryCache.get(key);
  }

  function material(color, roughness = 0.76) {
    const key = `${color}:${roughness}`;
    if (!materialCache.has(key)) {
      const value = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
      materials.add(value);
      materialCache.set(key, value);
    }
    return materialCache.get(key);
  }

  function mesh(parent, geo, color, position, scale, roughness) {
    const object = new THREE.Mesh(geo, material(color, roughness));
    if (position) object.position.set(...position);
    if (scale) object.scale.set(...scale);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function sphere(parent, color, position, scale) {
    return mesh(parent, geometry('sphere', () => new THREE.SphereGeometry(1, 24, 16)), color, position, scale);
  }

  function cylinder(parent, color, position, scale) {
    return mesh(parent, geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 40)), color, position, scale);
  }

  function box(parent, color, position, scale) {
    return mesh(parent, geometry('soft-box', () => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.4, -0.45);
      shape.lineTo(0.4, -0.45);
      shape.quadraticCurveTo(0.45, -0.45, 0.45, -0.4);
      shape.lineTo(0.45, 0.4);
      shape.quadraticCurveTo(0.45, 0.45, 0.4, 0.45);
      shape.lineTo(-0.4, 0.45);
      shape.quadraticCurveTo(-0.45, 0.45, -0.45, 0.4);
      shape.lineTo(-0.45, -0.4);
      shape.quadraticCurveTo(-0.45, -0.45, -0.4, -0.45);
      const value = new THREE.ExtrudeGeometry(shape, {
        depth: 0.9, bevelEnabled: true, bevelThickness: 0.05,
        bevelSize: 0.05, bevelSegments: 2, steps: 1, curveSegments: 3,
      });
      value.translate(0, 0, -0.45);
      return value;
    }), color, position, scale);
  }

  function heart(parent, color, position, size = 1) {
    const geo = geometry('heart', () => {
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.47);
      shape.bezierCurveTo(-0.18, -0.28, -0.56, -0.02, -0.48, 0.27);
      shape.bezierCurveTo(-0.41, 0.56, -0.1, 0.54, 0, 0.32);
      shape.bezierCurveTo(0.1, 0.54, 0.41, 0.56, 0.48, 0.27);
      shape.bezierCurveTo(0.56, -0.02, 0.18, -0.28, 0, -0.47);
      const value = new THREE.ExtrudeGeometry(shape, {
        depth: 0.12, bevelEnabled: true, bevelSegments: 3,
        steps: 1, bevelSize: 0.055, bevelThickness: 0.055, curveSegments: 12,
      });
      value.translate(0, 0, -0.06);
      return value;
    });
    return mesh(parent, geo, color, position, [size, size, size]);
  }

  function tube(parent, color, points, radius, segments = 40) {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    const geo = new THREE.TubeGeometry(curve, segments, radius, 8, false);
    geometries.add(geo);
    return { object: mesh(parent, geo, color), curve };
  }

  function makePizza(parent) {
    const pizza = new THREE.Group();
    parent.add(pizza);
    const wedge = geometry('pizza-wedge', () => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.42, 0.54);
      shape.quadraticCurveTo(0, 0.67, 0.42, 0.54);
      shape.lineTo(0.03, -0.39);
      shape.quadraticCurveTo(0, -0.44, -0.03, -0.39);
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, {
        depth: 0.07, bevelEnabled: true, bevelSegments: 2,
        bevelSize: 0.025, bevelThickness: 0.025, curveSegments: 10, steps: 1,
      });
    });
    mesh(pizza, wedge, '#e7ad67');
    const cheese = mesh(pizza, wedge, '#ffdf83', [0, 0.008, 0.065], [0.92, 0.94, 0.45]);
    cheese.castShadow = false;
    tube(pizza, '#e7af74', [[-0.42, 0.55, 0.06], [0, 0.63, 0.065], [0.42, 0.55, 0.06]], 0.073, 20);
    [[-0.17, 0.34], [0.17, 0.31], [0, 0.02]].forEach(([x, y], index) => {
      const topping = sphere(pizza, '#dc7070', [x, y, 0.13], [0.105, 0.105, 0.022]);
      topping.rotation.z = index * 0.7;
      sphere(pizza, '#f4a087', [x - 0.025, y + 0.023, 0.151], [0.022, 0.016, 0.005]);
    });
    [[-0.25, 0.46], [0.13, 0.12], [-0.06, -0.15]].forEach(([x, y], index) => {
      const leaf = sphere(pizza, '#7eab83', [x, y, 0.145], [0.035, 0.07, 0.012]);
      leaf.rotation.z = 0.7 + index;
    });
    return pizza;
  }

  function makePig(parent) {
    const pig = new THREE.Group();
    parent.add(pig);
    sphere(pig, COLORS.pink, [0, 1.07, 0], [0.73, 0.83, 0.57]);
    sphere(pig, COLORS.lightPink, [0, 0.99, 0.455], [0.46, 0.53, 0.16]);
    [-1, 1].forEach((side) => {
      const leg = sphere(pig, COLORS.pink, [side * 0.51, 0.44, 0.31], [0.33, 0.27, 0.42]);
      leg.rotation.z = side * -0.17;
      sphere(pig, '#d9849d', [side * 0.54, 0.415, 0.625], [0.245, 0.18, 0.15]);
      box(pig, '#c6718b', [side * 0.54, 0.415, 0.765], [0.021, 0.13, 0.015]);
      const arm = sphere(pig, COLORS.pink, [side * 0.67, 1.18, 0.32], [0.235, 0.45, 0.25]);
      arm.rotation.z = side * 0.38;
    });

    const head = new THREE.Group();
    head.position.set(0, 2.01, 0.04);
    head.rotation.z = -0.055;
    pig.add(head);
    sphere(head, COLORS.pink, [0, 0, 0], [0.88, 0.76, 0.69]);
    const earGeo = geometry('pig-ear', () => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.24, 0);
      shape.bezierCurveTo(-0.3, 0.2, -0.19, 0.63, 0, 0.69);
      shape.bezierCurveTo(0.12, 0.68, 0.3, 0.2, 0.24, 0);
      shape.quadraticCurveTo(0, -0.13, -0.24, 0);
      const value = new THREE.ExtrudeGeometry(shape, {
        depth: 0.12, bevelEnabled: true, bevelThickness: 0.075,
        bevelSize: 0.07, bevelSegments: 3, curveSegments: 10, steps: 1,
      });
      value.translate(0, 0, -0.06);
      return value;
    });
    [-1, 1].forEach((side) => {
      const ear = new THREE.Group();
      ear.position.set(side * 0.55, 0.5, -0.045);
      ear.rotation.set(-0.13, side * -0.15, side * -0.28);
      head.add(ear);
      mesh(ear, earGeo, COLORS.pink);
      mesh(ear, earGeo, '#e98ba3', [0, 0.06, 0.115], [0.57, 0.69, 0.27]);
      sphere(head, '#f08fa8', [side * 0.57, -0.17, 0.548], [0.2, 0.115, 0.035]);
      sphere(head, COLORS.dark, [side * 0.325, 0.115, 0.626], [0.071, 0.095, 0.043]);
      sphere(head, '#fff9ee', [side * 0.325 - 0.019, 0.148, 0.663], [0.022, 0.028, 0.011]);
      const brow = sphere(head, '#d77f96', [side * 0.34, 0.295, 0.59], [0.088, 0.023, 0.025]);
      brow.rotation.z = side * -0.12;
    });
    sphere(head, '#f6b4c0', [0, -0.15, 0.662], [0.365, 0.245, 0.19]);
    [-1, 1].forEach((side) => {
      sphere(head, '#c5738b', [side * 0.127, -0.14, 0.833], [0.045, 0.064, 0.015]);
    });
    tube(head, '#ae647c', [[-0.095, -0.414, 0.566], [0, -0.444, 0.585], [0.095, -0.414, 0.566]], 0.014, 12);
    tube(pig, '#e991aa', [[-0.63, 0.84, -0.3], [-0.94, 0.86, -0.35], [-1.03, 1.03, -0.31], [-0.89, 1.13, -0.27], [-0.8, 1.02, -0.24]], 0.045, 24);

    const pizza = makePizza(pig);
    pizza.position.set(0.9, 1.22, 0.68);
    pizza.rotation.set(-0.12, -0.18, -0.3);
    sphere(pig, COLORS.pink, [0.73, 1.12, 0.84], [0.19, 0.17, 0.16]);
    return pig;
  }

  function createHero() {
    const stage = new THREE.Group();
    scene.add(stage);
    cylinder(stage, '#f3ddca', [0, 0.01, 0], [1.5, 0.22, 1.32]);
    cylinder(stage, COLORS.cream, [0, 0.14, 0], [1.53, 0.12, 1.35]);
    const pig = makePig(stage);
    pig.rotation.y = -0.12;
    moving.push((time) => {
      pig.position.y = reducedMotion ? 0 : Math.sin(time * 1.45) * 0.035;
      pig.rotation.y = -0.12 + currentX * 0.15;
      pig.rotation.x = currentY * 0.035;
    });

    [
      [-1.3, 2.46, 0.05, 0.34, COLORS.coral, -0.22],
      [1.35, 2.92, -0.15, 0.25, '#e9a0b8', 0.22],
      [-1.08, 3.2, -0.32, 0.18, '#efbd80', 0.13],
    ].forEach(([x, y, z, size, color, angle], index) => {
      const object = heart(stage, color, [x, y, z], size);
      object.rotation.set(-0.08, 0.3, angle);
      moving.push((time) => {
        object.position.y = y + (reducedMotion ? 0 : Math.sin(time * 1.1 + index * 2) * 0.085);
        object.rotation.y = 0.3 + (reducedMotion ? 0 : Math.sin(time * 0.8 + index) * 0.15);
      });
    });
    // Small clay confetti rests on the plinth, leaving the silhouette uncluttered.
    [[-1.05, 0.23, 0.65], [0.94, 0.23, -0.55], [-0.85, 0.23, -0.75]].forEach((point, index) => {
      const petal = heart(stage, index === 1 ? COLORS.butter : '#edb6bf', point, 0.13);
      petal.rotation.set(-Math.PI / 2, 0, index * 1.7);
    });
    camera.position.set(4, 3.5, 9);
  }

  function createRoute() {
    const city = new THREE.Group();
    scene.add(city);
    box(city, '#efdfd0', [0, -0.17, 0], [8.6, 0.32, 5.6]);
    box(city, '#fbf0df', [0, 0, 0], [8.55, 0.12, 5.55]);
    box(city, '#e3dcd3', [0, 0.079, 0], [8.35, 0.035, 0.85]);
    [-2, 2].forEach((x) => box(city, '#e3dcd3', [x, 0.078, 0], [0.76, 0.035, 5.3]));
    for (let x = -3.7; x <= 3.7; x += 0.52) {
      if (Math.abs(Math.abs(x) - 2) > 0.52) box(city, '#fffaf0', [x, 0.103, -0.24], [0.24, 0.009, 0.035]);
    }
    [-2, 2].forEach((x) => {
      [-2.2, -1.7, -1.2, 1.05, 1.58, 2.1].forEach((z) => {
        box(city, '#fffaf0', [x + 0.2, 0.103, z], [0.035, 0.009, 0.23]);
      });
    });

    function building(x, z, width, depth, height, color, roofColor) {
      box(city, '#f4e6d4', [x, 0.12, z], [width + 0.15, 0.12, depth + 0.15]);
      box(city, color, [x, height / 2 + 0.17, z], [width, height, depth]);
      box(city, roofColor, [x, height + 0.19, z], [width + 0.08, 0.16, depth + 0.08]);
      const front = z + depth / 2 + 0.008;
      [-1, 1].forEach((side) => {
        box(city, '#fcf6e6', [x + side * width * 0.24, height * 0.64 + 0.17, front], [width * 0.2, 0.2, 0.035]);
        if (height > 0.85) box(city, '#fcf6e6', [x + side * width * 0.24, 0.48, front], [width * 0.2, 0.2, 0.035]);
      });
      box(city, '#a3bdb5', [x, 0.35, front + 0.005], [0.16, 0.35, 0.045]);
    }

    building(-3.12, -1.48, 1.12, 1.1, 0.95, '#e8b9c3', '#d78eaa');
    building(-0.95, -1.63, 0.86, 1.05, 1.36, '#b9cbbb', '#8fae9e');
    building(0.42, -1.6, 0.95, 1.14, 0.83, '#ecd299', '#deb67a');
    building(3.17, 0.94, 1.05, 0.85, 0.85, '#c8bed4', '#ab9bbb');
    building(0.65, 1.65, 1.15, 0.88, 1.0, '#efbdab', '#d99485');
    building(-0.84, 1.59, 0.8, 0.98, 0.68, '#b9d0ce', '#90b3b2');

    // The destination is a toy house, deliberately unrelated to a real address.
    const home = new THREE.Group();
    home.position.set(3.08, 0.13, -1.8);
    city.add(home);
    box(home, '#fff0dc', [0, 0.38, 0], [1.03, 0.76, 0.87]);
    const roofGeo = geometry('house-roof', () => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.63, 0);
      shape.lineTo(0, 0.57);
      shape.lineTo(0.63, 0);
      shape.closePath();
      const value = new THREE.ExtrudeGeometry(shape, { depth: 1.02, bevelEnabled: false });
      value.translate(0, 0, -0.51);
      return value;
    });
    mesh(home, roofGeo, '#df8f9e', [0, 0.78, 0]);
    box(home, '#b1c8bc', [0.2, 0.25, 0.455], [0.22, 0.5, 0.045]);
    box(home, '#eab96f', [-0.25, 0.46, 0.455], [0.24, 0.24, 0.045]);
    box(home, '#fff5df', [-0.25, 0.46, 0.483], [0.022, 0.24, 0.012]);

    function tree(x, z, size = 1, color = '#a9c4a0') {
      cylinder(city, '#c5a38c', [x, 0.32 * size + 0.1, z], [0.075 * size, 0.52 * size, 0.075 * size]);
      sphere(city, color, [x, 0.79 * size + 0.1, z], [0.32 * size, 0.43 * size, 0.31 * size]);
      sphere(city, '#bdd3af', [x - 0.13 * size, 0.69 * size + 0.1, z + 0.06], [0.22 * size, 0.27 * size, 0.23 * size]);
    }
    [[-3.75, -0.73, 0.8], [-3.8, 2.05, 0.95], [-2.8, 2.2, 0.75], [-1.31, -0.76, 0.75],
      [0.99, -2.23, 0.8], [1.17, 0.83, 0.82], [3.8, -0.65, 0.8], [3.45, 2.1, 1],
      [-0.15, 2.3, 0.68]].forEach(([x, z, size]) => tree(x, z, size));
    box(city, '#c8d7ad', [-3.12, 0.11, 1.15], [1.32, 0.1, 1.25]);
    box(city, '#c8d7ad', [0.44, 0.11, 0.8], [0.7, 0.1, 0.38]);
    [-0.19, 0, 0.19].forEach((x) => sphere(city, '#edb6c0', [0.44 + x, 0.22, 0.8], [0.09, 0.13, 0.09]));

    const pathPoints = [[-3.05, 0.16, 1.25], [-2.17, 0.16, 1.25], [-2, 0.16, 0.8],
      [-1.8, 0.16, 0], [-0.7, 0.16, 0], [0.8, 0.16, 0], [1.8, 0.16, -0.05],
      [2, 0.16, -0.7], [2, 0.16, -1.32], [2.63, 0.16, -1.32]];
    tube(city, '#fff8eb', pathPoints, 0.105, 90);
    const { curve } = tube(city, COLORS.coral, pathPoints.map(([x, y, z]) => [x, y + 0.025, z]), 0.057, 90);

    function pin(x, z, color, destination) {
      cylinder(city, '#fff5e8', [x, 0.15, z], [0.31, 0.08, 0.31]);
      cylinder(city, color, [x, 0.2, z], [0.21, 0.045, 0.21]);
      const group = new THREE.Group();
      group.position.set(x, 0.25, z);
      group.rotation.y = Math.PI / 4;
      city.add(group);
      const geo = geometry('map-pin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.bezierCurveTo(-0.1, 0.18, -0.35, 0.4, -0.35, 0.65);
        shape.bezierCurveTo(-0.35, 1.1, 0.35, 1.1, 0.35, 0.65);
        shape.bezierCurveTo(0.35, 0.4, 0.1, 0.18, 0, 0);
        return new THREE.ExtrudeGeometry(shape, {
          depth: 0.09, bevelEnabled: true, bevelSegments: 2,
          bevelSize: 0.035, bevelThickness: 0.035, curveSegments: 12, steps: 1,
        });
      });
      mesh(group, geo, color);
      if (destination) {
        box(group, '#fff9ef', [0, 0.63, 0.15], [0.29, 0.27, 0.025]);
        const roof = mesh(group, roofGeo, '#fff9ef', [0, 0.76, 0.15], [0.3, 0.3, 0.03]);
        roof.castShadow = false;
        box(group, color, [0.055, 0.575, 0.17], [0.065, 0.14, 0.018]);
      } else {
        heart(group, '#fff9ef', [0, 0.66, 0.16], 0.37);
      }
    }
    pin(-3.05, 1.25, '#e798b2', false);
    pin(2.63, -1.32, COLORS.coral, true);

    const traveler = heart(city, '#ed748b', [0, 0, 0], 0.27);
    traveler.rotation.y = Math.PI / 4;
    const point = new THREE.Vector3();
    moving.push((time) => {
      const progress = reducedMotion ? 0.48 : (time * 0.073 + 0.15) % 1;
      curve.getPointAt(progress, point);
      traveler.position.copy(point);
      traveler.position.y += 0.27 + (reducedMotion ? 0 : Math.sin(time * 3) * 0.045);
      traveler.rotation.z = reducedMotion ? -0.08 : Math.sin(time * 1.8) * 0.13;
    });
    camera.position.set(8.6, 10.5, 11.6);
  }

  function resize() {
    if (destroyed || !renderer) return;
    const { width, height } = container.getBoundingClientRect();
    hasSize = width > 0 && height > 0;
    if (!hasSize) {
      pause();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(width, height, false);
    const aspect = width / height;
    // Fit both axes: narrow mobile frames must not clip ears, pins, or the city slab.
    const viewHeight = isRoute ? Math.max(8.05, 11.3 / aspect) : Math.max(4.15, 3.95 / aspect);
    camera.left = -viewHeight * aspect / 2;
    camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderStill();
    resume();
  }

  function updateScene() {
    for (const update of moving) update(elapsed);
  }

  function renderStill() {
    if (destroyed || !hasSize || !visible) return;
    updateScene();
    renderer.render(scene, camera);
  }

  function tick(now) {
    frame = 0;
    if (destroyed || reducedMotion || !visible || !hasSize) return;
    const delta = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsed += delta;
    const smoothing = 1 - Math.exp(-delta * 5);
    currentX += (pointerX - currentX) * smoothing;
    currentY += (pointerY - currentY) * smoothing;
    updateScene();
    renderer.render(scene, camera);
    frame = window.requestAnimationFrame(tick);
  }

  function pause() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    lastTime = null;
  }

  function resume() {
    if (!destroyed && !frame && !reducedMotion && visible && hasSize) {
      frame = window.requestAnimationFrame(tick);
    }
  }

  function onPointerMove(event) {
    if (reducedMotion || isRoute) return;
    const bounds = container.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointerX = THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
    pointerY = THREE.MathUtils.clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
  }

  function onPointerLeave() {
    pointerX = 0;
    pointerY = 0;
  }

  function onMotionChange(event) {
    reducedMotion = event.matches;
    if (reducedMotion) {
      pause();
      pointerX = pointerY = currentX = currentY = 0;
      renderStill();
    } else {
      resume();
    }
  }

  function onVisibilityChange() {
    visible = !document.hidden;
    if (visible) {
      renderStill();
      resume();
    } else {
      pause();
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    pause();
    observer?.disconnect();
    window.removeEventListener('resize', resize);
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerleave', onPointerLeave);
    container.removeEventListener('pointerup', onPointerLeave);
    container.removeEventListener('pointercancel', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (media?.removeEventListener) media.removeEventListener('change', onMotionChange);
    else media?.removeListener?.(onMotionChange);
    for (const value of geometries) value.dispose();
    for (const value of materials) value.dispose();
    scene.traverse((object) => object.shadow?.dispose());
    scene.clear();
    moving.length = 0;
    geometryCache.clear();
    materialCache.clear();
    geometries.clear();
    materials.clear();
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  }

  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    scene.add(new THREE.HemisphereLight('#fff4e6', '#cfb9b7', 2.5));
    const key = new THREE.DirectionalLight('#fff3dc', 3.3);
    key.position.set(-3.5, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const span = isRoute ? 7 : 3.8;
    Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 0.5, far: 24 });
    key.shadow.normalBias = 0.035;
    key.shadow.bias = -0.00015;
    key.shadow.radius = 4;
    scene.add(key);
    const fill = new THREE.DirectionalLight('#ffe5e8', 1.4);
    fill.position.set(4, 3, -3);
    scene.add(fill);

    const shadowMaterial = new THREE.ShadowMaterial({ color: '#9c7472', opacity: 0.14, depthWrite: false });
    materials.add(shadowMaterial);
    const shadowPlane = new THREE.Mesh(geometry('shadow-plane', () => new THREE.PlaneGeometry(40, 40)), shadowMaterial);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = isRoute ? -0.35 : -0.12;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    if (isRoute) createRoute();
    else createHero();
    camera.lookAt(viewTarget);
    media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion = media.matches;
    visible = !document.hidden;
    if (media.addEventListener) media.addEventListener('change', onMotionChange);
    else media.addListener(onMotionChange);
    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave);
    container.addEventListener('pointerup', onPointerLeave);
    container.addEventListener('pointercancel', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('resize', resize, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(resize);
      observer.observe(container);
    }
    resize();
    return { destroy };
  } catch (error) {
    destroy();
    throw error;
  }
}
