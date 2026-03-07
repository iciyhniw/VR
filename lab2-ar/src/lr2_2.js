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

// Важливе налаштування для правильного відображення кольорів текстур моделі
renderer.outputColorSpace = THREE.SRGBColorSpace; 
document.body.appendChild(renderer.domElement);

// 3. Додавання кнопки AR
document.body.appendChild(ARButton.createButton(renderer));

// 4. Додавання освітлення
const ambientLight = new THREE.AmbientLight(0xffffff, 1); 
scene.add(ambientLight);

// Направлене світло для створення об'єму та відблисків
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(1, 2, 1);
scene.add(directionalLight);

// Змінна для збереження нашої моделі, щоб ми могли її анімувати
let myModel = null;

// 5. Завантаження GLTF моделі
const loader = new GLTFLoader();

// Шлях до моделі
const modelPath = './models/scene.gltf';

loader.load(
    modelPath,
    (gltf) => {
        myModel = gltf.scene;

        // Використання model.traverse() для налаштування матеріалів кожного елемента моделі
        myModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                
                
                // node.material.roughness = 0.5;
                // node.material.metalness = 0.5;
            }
        });

        
        
        myModel.scale.set(0.5, 0.5, 0.5); 

        // Розміщення моделі прямо перед камерою користувача
        myModel.position.set(0, 0, -1.5); 

        // Додаємо модель на сцену
        scene.add(myModel);
        
        console.log("Модель успішно завантажена та додана на сцену!");
    },
    (xhr) => {
        console.log(`Завантаження моделі: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
    },
    (error) => {
        console.error('Сталася помилка під час завантаження моделі:', error);
    }
);

// 6. Анімація
function render(timestamp, frame) {
    // Якщо модель вже завантажилась, анімуємо її
    if (myModel) {
        // Використовуємо MathUtils для конвертації градусів у радіани
        // Обертаємо модель на 1 градус по осі Y кожного кадру
        const rotationSpeed = THREE.MathUtils.degToRad(1); 
        myModel.rotation.y += rotationSpeed;
    }

    renderer.render(scene, camera);
}

// Запуск циклу рендерингу для WebXR
renderer.setAnimationLoop(render);

// 7. Обробка зміни розміру вікна браузера
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});