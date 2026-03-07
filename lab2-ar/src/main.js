import './style.css'
import * as THREE from 'three';

import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

// 1. Ініціалізація сцени, камери
const scene = new THREE.Scene();
// Камера для WebXR керується пристроєм, але нам потрібна базова перспектива
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

// 2. Налаштування рендерера
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; // АКТИВАЦІЯ WebXR
document.body.appendChild(renderer.domElement);

// 3. Додавання інтерактивної кнопки для входу в AR
document.body.appendChild(ARButton.createButton(renderer));

// 4. Додавання освітлення (щоб було видно матеріали)
const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
light.position.set(0.5, 1, 0.25);
scene.add(light);

// 5. Створення 3D об'єктів згідно варіанту
const objects = [];

// --- Об'єкт 1: TorusKnotGeometry ---
const torusKnotGeo = new THREE.TorusKnotGeometry(0.1, 0.03, 100, 16);
const torusKnotMat = new THREE.MeshStandardMaterial({ 
    color: 0xff0000, 
    roughness: 0.4, 
    metalness: 0.3 
});
const torusKnot = new THREE.Mesh(torusKnotGeo, torusKnotMat);
// Розміщуємо зліва і на відстані 1.5 метра від камери
torusKnot.position.set(-0.4, 0, -1.5); 
scene.add(torusKnot);
objects.push(torusKnot);

// --- Об'єкт 2: TubeGeometry ---
// Спершу створюємо шлях для труби (синусоїда)
class CustomSinCurve extends THREE.Curve {
    constructor(scale = 1) { super(); this.scale = scale; }
    getPoint(t, optionalTarget = new THREE.Vector3()) {
        const tx = t * 3 - 1.5;
        const ty = Math.sin(2 * Math.PI * t);
        const tz = 0;
        return optionalTarget.set(tx, ty, tz).multiplyScalar(this.scale);
    }
}
const path = new CustomSinCurve(0.15);
// Геометрія: TubeGeometry, Матеріал: MeshPhongMaterial (Зелений, блискучий)
const tubeGeo = new THREE.TubeGeometry(path, 20, 0.04, 8, false);
const tubeMat = new THREE.MeshPhongMaterial({ color: 0x00ff00, shininess: 100 });
const tube = new THREE.Mesh(tubeGeo, tubeMat);
// Розміщуємо по центру і на відстані 1.5 метра від камери
tube.position.set(0, 0, -1.5); 
scene.add(tube);
objects.push(tube);

// --- Об'єкт 3: ExtrudeGeometry ---
// Спершу створюємо 2D форму (квадрат)
const shape = new THREE.Shape();
shape.moveTo(0, 0);
shape.lineTo(0, 0.15);
shape.lineTo(0.15, 0.15);
shape.lineTo(0.15, 0);
shape.lineTo(0, 0);

const extrudeSettings = { 
    depth: 0.05, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.01, bevelThickness: 0.01 
};
// Геометрія: ExtrudeGeometry, Матеріал: MeshPhysicalMaterial (Синій, "скляний" ефект)
const extrudeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
extrudeGeo.center(); // Центруємо геометрію навколо її осей
const extrudeMat = new THREE.MeshPhysicalMaterial({ 
    color: 0x0000ff, clearcoat: 1.0, clearcoatRoughness: 0.1 
});
const extrude = new THREE.Mesh(extrudeGeo, extrudeMat);
// Розміщуємо справа і на відстані 1.5 метра від камери
extrude.position.set(0.4, 0, -1.5); 
scene.add(extrude);
objects.push(extrude);

// 6. Базова анімація та рендеринг
function render(timestamp, frame) {
    // Анімуємо кожен об'єкт масиву
    objects.forEach(obj => {
        obj.rotation.x += 0.01;
        obj.rotation.y += 0.01;
    });

    renderer.render(scene, camera);
}

// Використовуємо setAnimationLoop замість requestAnimationFrame для WebXR
renderer.setAnimationLoop(render);

// 7. Обробка зміни розміру вікна браузера
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


