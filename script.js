let scene, camera, renderer, controls, composer;
let objects = [];  // Mảng chung cho cả text và shape
// const ttfLoader = new THREE.TTFLoader(); // Xóa dòng này hoặc comment lại
const fontLoader = new THREE.FontLoader(); // Sử dụng lại FontLoader
const words = [
    "我爱你", "谢谢你一直陪伴着我", // xuất hiện 2 lần
    "永远和我在一起", // xuất hiện 2 lần
    "我真的真的爱你", // xuất hiện 2 lần
    "无论发生什么，我还是想和你在一起"
];

// --- TÙY CHỈNH MÀU SẮC VÀ THÔNG SỐ --- 
const CUSTOM_COLORS = {
    backgroundColor: 0x280018, // Nền tím than đậm, hơi ngả sang hồng
    fogColor: 0x300020,        // Sương mù đồng bộ, tối hơn một chút
    ambientLightColor: 0xffd1dc, // Ánh sáng môi trường (màu Pink Lace - hồng rất nhạt)
    ambientLightIntensity: 0.45,  // Tăng nhẹ so với 0.2 của bạn, nhưng vẫn dịu
    mainLightColor: 0xFFFFFF,    // Đèn chính
    mainLightIntensity: 0.8,   // Giảm nhẹ so với 0.9 của bạn để màu hồng nổi hơn
    pinkLightColor: 0xff85a2,    // Đèn điểm hồng (màu hồng tươi tắn hơn)
    pinkLightIntensity: 0.65,   // Giảm nhẹ để cân bằng
    purpleLightColor: 0x9370DB,  // Đèn điểm tím (Medium Purple - tím dịu hơn)
    purpleLightIntensity: 0.4,   // Giảm nhẹ
    textMaterialColor: 0xFFF0F5,   // Màu chữ (LavenderBlush - trắng ngả hồng, rất sáng)
    shapeMaterialColor: 0xFF69B4,  // Màu shape (giữ nguyên hoặc có thể làm nhạt hơn chút)
    fallingHeartColor: 0xFF1493, // Màu trái tim rơi (DeepPink - giữ nguyên cho nổi bật)
};
const NUM_FALLING_HEARTS = 75 * 3; // Gấp 3 lần mật độ trái tim hiện tại (75 * 3 = 225)
// --- KẾT THÚC TÙY CHỈNH --- 

// Kiểm tra xem các module cần thiết đã tồn tại chưa
const isPostProcessingAvailable = () => {
    return typeof THREE.EffectComposer !== 'undefined' &&
           typeof THREE.RenderPass !== 'undefined' &&
           typeof THREE.UnrealBloomPass !== 'undefined';
};

// Thêm gradient và shine effect cho material
const textMaterial = new THREE.MeshPhysicalMaterial({
    color: CUSTOM_COLORS.textMaterialColor,
    metalness: 0.7,
    roughness: 0.2,
    reflectivity: 0.8,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 1
});

// Tối ưu: Dùng chung một material cho tất cả shape
const shapeMaterial = new THREE.MeshPhysicalMaterial({
    color: CUSTOM_COLORS.shapeMaterialColor,
    metalness: 0.8,
    roughness: 0.1,
    reflectivity: 1,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.9
});

// Thêm particles cho hiệu ứng lấp lánh
let particles;
const particleCount = 300;

// Biến audio đơn giản
let audio;
let musicStarted = false;

// Cache các geometry để tái sử dụng
const geometryCache = {
    heart: null,
    star: null,
    hexagon: null
};

// Tối ưu: Giảm độ phức tạp của hình trái tim
function createHeartGeometry() {
    if (geometryCache.heart) return geometryCache.heart;

    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0.5);
    heartShape.bezierCurveTo(0, 0.8, 0.7, 0.8, 0.7, 0.3);
    heartShape.bezierCurveTo(0.7, -0.2, 0, -0.2, 0, 0.2);
    heartShape.bezierCurveTo(0, -0.2, -0.7, -0.2, -0.7, 0.3);
    heartShape.bezierCurveTo(-0.7, 0.8, 0, 0.8, 0, 0.5);

    const geometry = new THREE.ExtrudeGeometry(heartShape, {
        depth: 0.3,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.1,
        bevelThickness: 0.1,
        curveSegments: 8
    });

    geometryCache.heart = geometry;
    return geometry;
}

// Tối ưu: Giảm số cạnh của ngôi sao
function createStarGeometry() {
    if (geometryCache.star) return geometryCache.star;

    const starShape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.8;
    const innerRadius = 0.4;
    
    for(let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i / points) * Math.PI;
        if(i === 0) {
            starShape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        } else {
            starShape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
    }
    starShape.closePath();

    const geometry = new THREE.ExtrudeGeometry(starShape, {
        depth: 0.2,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.1,
        bevelThickness: 0.1,
        curveSegments: 4
    });

    geometryCache.star = geometry;
    return geometry;
}

// Tối ưu: Đơn giản hóa lục giác
function createHexagonGeometry() {
    if (geometryCache.hexagon) return geometryCache.hexagon;

    const hexShape = new THREE.Shape();
    const size = 0.6;
    for(let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        if(i === 0) {
            hexShape.moveTo(Math.cos(angle) * size, Math.sin(angle) * size);
        } else {
            hexShape.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
        }
    }
    hexShape.closePath();

    const geometry = new THREE.ExtrudeGeometry(hexShape, {
        depth: 0.2,
        bevelEnabled: true,
        bevelSegments: 1,
        bevelSize: 0.1,
        bevelThickness: 0.1
    });

    geometryCache.hexagon = geometry;
    return geometry;
}

// Tạo hệ thống particles
function createParticleSystem() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for(let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = Math.random() * 120 - 30;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
        sizes[i] = Math.random() * 0.5;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.3,
        transparent: true,
        opacity: 0.6,
        map: createSparkleTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

// Tạo texture cho particles
function createSparkleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,200,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Thêm hiệu ứng cho scene
function addSceneEffects() {
    // Thêm fog để tạo độ sâu - Chuyển sang màu tối có ánh hồng
    scene.fog = new THREE.FogExp2(CUSTOM_COLORS.fogColor, 0.002);
    
    // Thêm ánh sáng ambient - Màu hồng nhạt, giảm cường độ
    const ambientLight = new THREE.AmbientLight(CUSTOM_COLORS.ambientLightColor, CUSTOM_COLORS.ambientLightIntensity);
    scene.add(ambientLight);

    // Thêm điểm sáng chính
    const mainLight = new THREE.PointLight(CUSTOM_COLORS.mainLightColor, CUSTOM_COLORS.mainLightIntensity);
    mainLight.position.set(0, 20, 50);
    scene.add(mainLight);

    // Thêm hai điểm sáng phụ với màu khác nhau
    const pinkLight = new THREE.PointLight(CUSTOM_COLORS.pinkLightColor, CUSTOM_COLORS.pinkLightIntensity);
    pinkLight.position.set(-30, 0, 20);
    scene.add(pinkLight);

    const purpleLight = new THREE.PointLight(CUSTOM_COLORS.purpleLightColor, CUSTOM_COLORS.purpleLightIntensity);
    purpleLight.position.set(30, 0, -20);
    scene.add(purpleLight);
}

// Khởi tạo audio và thêm nút
function initAudio() {
    audio = new Audio('nhac.mp3');
    audio.loop = true;
}

// Hàm phát nhạc đơn giản
function playMusic() {
    if (!musicStarted && audio) {
        audio.play()
            .then(() => {
                musicStarted = true;
                updateMusicButton('🔊');
            })
            .catch(error => {
                console.warn('Playback failed:', error);
                updateMusicButton('🔇');
            });
    }
}

// Hàm dừng nhạc
function pauseMusic() {
    if (musicStarted && audio) {
        audio.pause();
        musicStarted = false;
        updateMusicButton('🔇');
    }
}

// Thêm nút điều khiển nhạc
function addMusicButton() {
    const button = document.createElement('button');
    button.id = 'musicButton';
    button.innerHTML = '🔇';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        z-index: 1000;
        backdrop-filter: blur(5px);
    `;

    button.onclick = () => {
        if (musicStarted) {
            pauseMusic();
        } else {
            playMusic();
        }
    };

    document.body.appendChild(button);
}

// Cập nhật icon nút nhạc
function updateMusicButton(icon) {
    const button = document.getElementById('musicButton');
    if (button) {
        button.innerHTML = icon;
    }
}

function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 40);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('scene'), 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(CUSTOM_COLORS.backgroundColor, 1); // Sử dụng biến
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Khởi tạo audio và thêm nút
    initAudio();
    addMusicButton();

    // Xử lý sự kiện click/touch để bắt đầu phát nhạc
    const startAudio = () => {
        playMusic();
    };

    // Thêm event listeners
    document.addEventListener('click', startAudio, { once: true });
    document.addEventListener('touchstart', startAudio, { once: true });

    // Kiểm tra và thêm post-processing
    if (isPostProcessingAvailable()) {
        composer = new THREE.EffectComposer(renderer);
        const renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);

        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.7,
            0.3,
            0.7
        );
        composer.addPass(bloomPass);
    }

    addSceneEffects();
    try {
        createParticleSystem();
    } catch (error) {
        console.warn('Could not create particle system:', error);
    }

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 30;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2 + 0.3;
    controls.minPolarAngle = Math.PI / 2 - 0.3;
    controls.enablePan = false;
    
    // Tối ưu controls cho mobile
    controls.enableZoom = !isMobile();
    controls.rotateSpeed = isMobile() ? 0.5 : 1;
    controls.touchAngularSpeed = 0.3;
    controls.touchZoomSpeed = 0.5;

    // ttfLoader.load(..., function (json) { ... }); // Xóa hoặc comment lại khối này
    console.log('Đang tải font...'); // Thêm log
    fontLoader.load(
        'Noto Sans SC_Regular.json',  // <-- Đảm bảo tên file này khớp với file bạn tạo từ Facetype.js
        // onLoad callback
        function ( font ) {
            console.log('Font đã tải thành công:', font); // Thêm log
            createObjects(font);
        },
        // onProgress callback
        function ( xhr ) {
            console.log( (xhr.loaded / xhr.total * 100) + '% font đã tải' ); // Thêm log
        },
        // onError callback
        function ( err ) {
            console.error( 'Lỗi khi tải font:', err ); // Thêm log lỗi chi tiết
        }
    ); 

    window.addEventListener('resize', onWindowResize, false);
    animate();
    createFallingHearts(NUM_FALLING_HEARTS); // Gọi hàm tạo trái tim rơi
    createLargeFallingHearts(15); // Thêm 15 trái tim lớn
}

// Hàm kiểm tra thiết bị di động
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function createObjects(font) {
    console.log('Bắt đầu tạo đối tượng chữ với font:', font); // Thêm log
    const textGeometryParams = {
        font: font,
        size: 3.9,
        height: 0.4,  // Giảm độ dày của chữ
        curveSegments: 8,  // Giảm số segment
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelOffset: 0,
        bevelSegments: 3
    };

    // Tối ưu: Giảm số lượng đối tượng
    const totalObjects = 40 * 1.5;  // Gấp 1.5 lần mật độ chữ (40 * 1.5 = 60)

    for (let i = 0; i < totalObjects; i++) {
        const word = words[Math.floor(Math.random() * words.length)];
        const textGeometry = new THREE.TextGeometry(word, textGeometryParams);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial.clone());

        // Tạo shape tương ứng
        let shapeGeometry;
        switch(word) {
            case "love":
                shapeGeometry = createHeartGeometry();
                break;
            case "Linh Chi":
            case "Chiiiii":
                shapeGeometry = createStarGeometry();
                break;
            default:
                shapeGeometry = createHexagonGeometry();
        }
        const shapeMesh = new THREE.Mesh(shapeGeometry, shapeMaterial.clone());

        // Vị trí ban đầu
        const x = (Math.random() - 0.5) * 80;
        const y = Math.random() * 120;
        const z = (Math.random() - 0.5) * 60;

        textMesh.position.set(x, y, z);
        shapeMesh.position.set(x, y + 4, z);

        // Xoay - Đặt góc xoay ban đầu của chữ thành 0 để hướng về camera
        textMesh.rotation.set(0, 0, 0); // Chữ hướng thẳng
        // Shape vẫn có thể xoay tự do hơn một chút nếu muốn
        const shapeRotationX = (Math.random() - 0.5) * Math.PI * 0.1;
        const shapeRotationY = (Math.random() - 0.5) * Math.PI * 0.5;
        const shapeRotationZ = (Math.random() - 0.5) * Math.PI * 0.1;
        shapeMesh.rotation.set(shapeRotationX, shapeRotationY, shapeRotationZ);

        // Dữ liệu animation
        const baseFallSpeed = (0.065 + Math.random() * 0.13);
        const textFallSpeed = baseFallSpeed * 1.5;
        const heartFallSpeed = textFallSpeed * 1.5 * 1.5; // Tăng thêm 1.5 lần tốc độ cho shape tim/sao

        const initialY = 60 + Math.random() * 20;

        textMesh.userData = { 
            initialY, 
            fallSpeed: textFallSpeed, 
            isText: true,
            rotationSpeed: (Math.random() - 0.5) * 0.001 // Giảm tốc độ xoay cho chữ
        };
        shapeMesh.userData = { 
            initialY: initialY + 4, 
            fallSpeed: (word === "love" || word === "Chiiiii" || word === "Linh Chi") ? heartFallSpeed : textFallSpeed, 
            isShape: true,
            rotationSpeed: (Math.random() - 0.5) * 0.001 // Giảm tốc độ xoay cho shape
        };

        scene.add(textMesh);
        scene.add(shapeMesh);
        objects.push(textMesh, shapeMesh);
    }
    console.log('Đã tạo xong các đối tượng chữ.'); // Thêm log
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Tối ưu: Sử dụng requestAnimationFrame hiệu quả hơn
let lastTime = 0;
const fps = 60;
const frameInterval = 1000 / fps;

function animate(currentTime = 0) {
    requestAnimationFrame(animate);

    const deltaTime = currentTime - lastTime;
    if (deltaTime < frameInterval) return;

    lastTime = currentTime - (deltaTime % frameInterval);
    const time = currentTime * 0.001;

    // Animate particles
    if (particles) {
        try {
            const positions = particles.geometry.attributes.position.array;
            const sizes = particles.geometry.attributes.size.array;
            
            for(let i = 0; i < particleCount; i++) {
                positions[i * 3 + 1] -= 0.1;
                if (positions[i * 3 + 1] < -30) {
                    positions[i * 3 + 1] = 90;
                }
                sizes[i] = Math.sin(time + i) * 0.3 + 0.5;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            particles.geometry.attributes.size.needsUpdate = true;
            particles.rotation.y = time * 0.05;
        } catch (error) {
            console.warn('Particle animation error:', error);
        }
    }

    objects.forEach(object => {
        if (object.userData.isLargeHeart) {
            // Cập nhật thời gian cho mỗi trái tim
            object.userData.time += 0.016; // Khoảng 60fps

            // Tính toán vị trí mới với hiệu ứng gió
            const windX = Math.sin(object.userData.time * object.userData.windFrequency + object.userData.windPhase) * object.userData.windAmplitude;
            const windZ = Math.cos(object.userData.time * object.userData.windFrequency + object.userData.windPhase) * object.userData.windAmplitude;

            // Cập nhật vị trí
            object.position.x = object.userData.initialX + windX * 10;
            object.position.z = object.userData.initialZ + windZ * 10;
            object.position.y -= object.userData.fallSpeed;

            // Xoay nhẹ nhàng theo hướng gió
            object.rotation.x += Math.sin(object.userData.time * 0.5) * 0.002;
            object.rotation.y += Math.cos(object.userData.time * 0.5) * 0.002;
            object.rotation.z += Math.sin(object.userData.time * 0.3) * 0.002;

            // Reset vị trí khi rơi xuống dưới
            if (object.position.y < -60) {
                object.position.y = object.userData.initialY;
                object.position.x = (Math.random() - 0.5) * 100;
                object.position.z = (Math.random() - 0.5) * 70;
                object.userData.initialX = object.position.x;
                object.userData.initialZ = object.position.z;
                object.userData.time = 0;
            }
        } else {
            // Animation cho các đối tượng khác (giữ nguyên code cũ)
            object.position.y -= object.userData.fallSpeed;

            if (object.userData.isShape) {
                object.rotation.y += Math.sin(time) * 0.01 + object.userData.rotationSpeed;
                object.rotation.z += Math.cos(time) * 0.005;
            } else {
                object.rotation.y = 0;
            }

            if (object.position.y < -60) {
                object.position.y = object.userData.initialY;
                object.position.x = (Math.random() - 0.5) * 80;
                object.position.z = (Math.random() - 0.5) * 60;
            }
        }

        // Hiệu ứng scale và opacity theo độ sâu
        const scale = 1 - (object.position.z + 30) / 60;
        const targetScale = object.userData.isShape ? scale * 0.8 : scale;
        object.scale.setScalar(targetScale);
        
        if (object.material.transparent) {
            object.material.opacity = Math.max(0.3, Math.min(1, scale * 1.2));
        }
    });

    controls.update();
    
    if (composer && isPostProcessingAvailable()) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

// Hàm tạo các trái tim hồng rơi riêng biệt
function createFallingHearts(count) {
    const heartGeo = createHeartGeometry();
    const heartMat = new THREE.MeshPhysicalMaterial({
        color: CUSTOM_COLORS.fallingHeartColor,
        metalness: 0.6,
        roughness: 0.2,
        reflectivity: 0.7,
        clearcoat: 0.4,
        transparent: true,
        opacity: 0.9
    });

    for (let i = 0; i < count; i++) {
        const heartMesh = new THREE.Mesh(heartGeo, heartMat.clone());

        const x = (Math.random() - 0.5) * 100; // Rải rác rộng hơn một chút
        const y = 70 + Math.random() * 50; // Xuất phát từ trên cao
        const z = (Math.random() - 0.5) * 70;

        heartMesh.position.set(x, y, z);
        heartMesh.scale.setScalar(Math.random() * 0.8 + 0.7); // Kích thước ngẫu nhiên

        const rotationX = (Math.random() - 0.5) * Math.PI * 0.2;
        const rotationY = (Math.random() - 0.5) * Math.PI; // Cho phép xoay tự do hơn
        const rotationZ = (Math.random() - 0.5) * Math.PI * 0.2;
        heartMesh.rotation.set(rotationX, rotationY, rotationZ);

        const baseHeartFallSpeed = (0.08 + Math.random() * 0.1);
        // Tính toán dựa trên tốc độ cơ bản của chữ (0.065) để có sự tương quan
        // Hoặc một cách đơn giản hơn là lấy một giá trị fallSpeed cơ sở và nhân lên
        const chữBaseSpeed = 0.065 * 1.5; // Tốc độ rơi cơ bản của chữ đã tăng
        const heartSpecificFallSpeed = chữBaseSpeed * 1.5 * 1.5; // Tăng thêm 1.5 lần tốc độ cho cơn mưa tim

        const initialY = 70 + Math.random() * 30;

        heartMesh.userData = {
            initialY,
            fallSpeed: heartSpecificFallSpeed,
            isShape: true, // Để chúng có hành vi xoay giống các shape khác
            isFallingHeart: true, // Cờ để nhận biết
            rotationSpeed: (Math.random() - 0.5) * 0.015
        };

        scene.add(heartMesh);
        objects.push(heartMesh);
    }
    console.log(`Đã tạo ${count} trái tim rơi.`);
}

// Hàm tạo các trái tim lớn rơi xuống
function createLargeFallingHearts(count) {
    const heartGeo = createHeartGeometry();
    const heartMat = new THREE.MeshPhysicalMaterial({
        color: CUSTOM_COLORS.fallingHeartColor,
        metalness: 0.6,
        roughness: 0.2,
        reflectivity: 0.7,
        clearcoat: 0.4,
        transparent: true,
        opacity: 0.9
    });

    for (let i = 0; i < count; i++) {
        const heartMesh = new THREE.Mesh(heartGeo, heartMat.clone());

        const x = (Math.random() - 0.5) * 100;
        const y = 70 + Math.random() * 50;
        const z = (Math.random() - 0.5) * 70;

        heartMesh.position.set(x, y, z);
        // Kích thước lớn hơn, tương đương với chữ
        heartMesh.scale.setScalar(Math.random() * 2 + 3);

        // Thêm dữ liệu cho hiệu ứng rơi trong gió
        const initialRotationX = (Math.random() - 0.5) * Math.PI * 0.2;
        const initialRotationY = (Math.random() - 0.5) * Math.PI;
        const initialRotationZ = (Math.random() - 0.5) * Math.PI * 0.2;
        heartMesh.rotation.set(initialRotationX, initialRotationY, initialRotationZ);

        // Tốc độ rơi chậm hơn và thêm chuyển động ngang
        const baseHeartFallSpeed = (0.03 + Math.random() * 0.05);
        const initialY = 70 + Math.random() * 30;
        
        // Thêm các thông số cho hiệu ứng gió
        const windAmplitude = 0.5 + Math.random() * 0.5; // Biên độ dao động
        const windFrequency = 0.001 + Math.random() * 0.002; // Tần số dao động
        const windPhase = Math.random() * Math.PI * 2; // Pha ban đầu ngẫu nhiên

        heartMesh.userData = {
            initialY,
            fallSpeed: baseHeartFallSpeed,
            isShape: true,
            isLargeHeart: true,
            rotationSpeed: (Math.random() - 0.5) * 0.01,
            // Thêm dữ liệu cho hiệu ứng gió
            windAmplitude,
            windFrequency,
            windPhase,
            initialX: x,
            initialZ: z,
            time: 0
        };

        scene.add(heartMesh);
        objects.push(heartMesh);
    }
    console.log(`Đã tạo ${count} trái tim lớn rơi.`);
}

init();