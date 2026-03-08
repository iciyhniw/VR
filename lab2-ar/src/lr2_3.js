import './style.css'
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

// 1. Ініціалізація сцени та камери
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

// 2. Налаштування рендерера
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; // АКТИВАЦІЯ WebXR
document.body.appendChild(renderer.domElement);

// 3. Додавання кнопки AR з підтримкою Hit Test
const arButtonOptions = { requiredFeatures: ['hit-test'] };
document.body.appendChild(ARButton.createButton(renderer, arButtonOptions));

// 4. Освітлення
const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
light.position.set(0.5, 1, 0.25);
scene.add(light);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 2, 0);
scene.add(directionalLight);

// 5. Створення мітки (Reticle)
const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
reticle.matrixAutoUpdate = false; // Вимикаємо автооновлення, бо будемо задавати матрицю вручну з Hit Test
reticle.visible = false; // Ховаємо, поки не знайдемо поверхню
scene.add(reticle);

// 6. Налаштування контролера (обробка тапу по екрану)
const controller = renderer.xr.getController(0);
controller.addEventListener('select', onSelect);
scene.add(controller);

function onSelect() {
    // Якщо мітка видима (тобто поверхню знайдено), ставимо об'єкт
    if (reticle.visible) {
        // Завдання: створення BoxGeometry
        const boxGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1); // Розмір 10х10х10 см
        
        // Генеруємо випадковий колір для кожного нового кубика
        const randomColor = Math.random() * 0xffffff;
        const boxMaterial = new THREE.MeshStandardMaterial({ 
            color: randomColor,
            roughness: 0.2,
            metalness: 0.1
        });
        
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        
        // Розміщуємо кубик точно там, де зараз знаходиться мітка
        box.position.setFromMatrixPosition(reticle.matrix);
        box.quaternion.setFromRotationMatrix(reticle.matrix);
        
        scene.add(box);
    }
}

// 7. Змінні для Hit Testing
let hitTestSource = null;
let hitTestSourceRequested = false;

// 8. Цикл рендерингу та логіка Hit Test
function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        // Запитуємо Hit Test Source один раз при запуску сесії
        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then((viewerSpace) => {
                session.requestHitTestSource({ space: viewerSpace }).then((source) => {
                    hitTestSource = source;
                });
            });

            // Очищаємо змінні, коли користувач виходить з AR
            session.addEventListener('end', () => {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });

            hitTestSourceRequested = true;
        }

        // Обробка результатів Hit Test кожного кадру
        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                // Якщо знайшли поверхню, беремо перший (найближчий) результат
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);

                // Робимо мітку видимою і переміщаємо її в точку дотику з поверхнею
                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                // Якщо телефон не бачить поверхню (наприклад, дивишся в небо)
                reticle.visible = false;
            }
        }
    }

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(render);

// 9. Обробка зміни розміру вікна браузера
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});