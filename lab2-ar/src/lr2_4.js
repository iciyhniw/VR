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
renderer.outputColorSpace = THREE.SRGBColorSpace; // Критично важливо для правильного відображення текстур
document.body.appendChild(renderer.domElement);

// 3. Додавання кнопки AR з підтримкою Hit Test
const arButtonOptions = { requiredFeatures: ['hit-test'] };
document.body.appendChild(ARButton.createButton(renderer, arButtonOptions));

// 4. Додавання освітлення
// HemisphereLight для м'якого загального заповнення
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
hemiLight.position.set(0, 2, 0);
scene.add(hemiLight);

// DirectionalLight для створення відблисків на матеріалах моделі
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

// Шлях до нової моделі згідно твоєї структури папок
const modelPath = './models/magic_ring/scene.gltf';

loader.load(
    modelPath,
    (gltf) => {
        modelTemplate = gltf.scene;

        // Налаштування матеріалів (вмикаємо тіні)
        modelTemplate.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        // Масштабуємо модель. Оскільки це нова модель, можливо, цей параметр 
        // доведеться змінити (наприклад, на 0.1 або 0.01), якщо вона виявиться завеликою.
        modelTemplate.scale.set(0.3, 0.3, 0.3); 
        
        console.log("Модель успішно завантажена і готова до розміщення!");
    },
    (xhr) => {
        console.log(`Завантаження моделі: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
    },
    (error) => {
        console.error('Помилка завантаження моделі:', error);
    }
);

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
        
        scene.add(newModel);
    }
}

// 8. Змінні для Hit Testing
let hitTestSource = null;
let hitTestSourceRequested = false;

// 9. Цикл рендерингу та логіка Hit Test
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

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(render);

// 10. Обробка зміни розміру вікна браузера
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});