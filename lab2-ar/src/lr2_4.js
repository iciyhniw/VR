import './style.css'
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 1. Ініціалізація сцени та камери
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

// 2. Налаштування рендерера
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; // АКТИВАЦІЯ WebXR
renderer.outputColorSpace = THREE.SRGBColorSpace; 
document.body.appendChild(renderer.domElement);

// 3. Додавання кнопки AR з підтримкою Hit Test
const arButtonOptions = { requiredFeatures: ['hit-test'] };
document.body.appendChild(ARButton.createButton(renderer, arButtonOptions));

// 4. Додавання освітлення
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
hemiLight.position.set(0, 2, 0);
scene.add(hemiLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(1, 2, 1);
scene.add(directionalLight);

// 5. Створення мітки (Reticle)
const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

// 6. Завантаження GLTF моделі (шаблон)
let modelTemplate = null;
const loader = new GLTFLoader();


const modelPath = './models/magic_ring/scene.gltf';

loader.load(
    modelPath,
    (gltf) => {
        modelTemplate = gltf.scene;

        modelTemplate.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        
        modelTemplate.scale.set(0.2, 0.2, 0.2); 
        
        console.log("Модель fireball успішно завантажена і готова до розміщення!");
    },
    (xhr) => {
        console.log(`Завантаження моделі: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
    },
    (error) => {
        console.error('Помилка завантаження моделі:', error);
    }
);

// Масив для зберігання всіх розміщених на сцені моделей
const activeModels = [];

// 7. Обробка тапу по екрану (додавання моделі на сцену)
const controller = renderer.xr.getController(0);
controller.addEventListener('select', onSelect);
scene.add(controller);

function onSelect() {
    // Якщо знайшли поверхню і шаблон моделі завантажився
    if (reticle.visible && modelTemplate) {
        const newModel = modelTemplate.clone();
        
        // Розміщуємо копію на місці мітки
        newModel.position.setFromMatrixPosition(reticle.matrix);
        newModel.quaternion.setFromRotationMatrix(reticle.matrix);
        
        //Зберігаємо початкову висоту моделі (Y), щоб відштовхуватись від неї при анімації
        newModel.userData.baseY = newModel.position.y;
        
        //Генеруємо випадковий зсув у часі, щоб кулі рухались не синхронно
        newModel.userData.timeOffset = Math.random() * Math.PI * 2;
        
        scene.add(newModel);
        
        // Додаємо модель до масиву активних об'єктів
        activeModels.push(newModel);
    }
}

// 8. Змінні для Hit Testing
let hitTestSource = null;
let hitTestSourceRequested = false;

// 9. Цикл рендерингу та логіка Hit Test + Анімація
function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then((viewerSpace) => {
                session.requestHitTestSource({ space: viewerSpace }).then((source) => {
                    hitTestSource = source;
                });
            });

            session.addEventListener('end', () => {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });

            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);

                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                reticle.visible = false;
            }
        }
    }

    // --- АНІМАЦІЯ ВОГНЯНИХ КУЛЬ ---
    // timestamp - це час у мілісекундах. Множимо його, щоб сповільнити рух.
    const time = timestamp * 0.002; 
    
    activeModels.forEach(model => {
        // 1. Обертання навколо своєї осі Y (швидкість обертання)
        model.rotation.y += 0.02;
        
        // 2. Плавний рух вгору-вниз (використовуємо Math.sin)
        // Амплітуда 0.05 означає, що куля буде відхилятися на 5 см вгору і 5 см вниз від базової точки
        model.position.y = model.userData.baseY + Math.sin(time + model.userData.timeOffset) * 0.05;
    });

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(render);

// 10. Обробка зміни розміру вікна браузера
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});