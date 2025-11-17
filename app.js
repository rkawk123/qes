/*
const API = "https://backend-6i2t.onrender.com/predict";

const $dropArea = document.getElementById("drop-area");
const $file = document.getElementById("file");
const $preview = document.getElementById("preview");
const $btn = document.getElementById("btn");
const $result = document.getElementById("result");
const $loader = document.getElementById("loading");
const $scanLine = document.querySelector(".scan-line");
const $resultText = document.getElementById("resultText");
const $cameraBtn = document.getElementById("camera-btn");
const $previewWrapper = document.querySelector(".preview-wrapper");
const $captureBtn = document.createElement("div");
const $video = document.createElement("video");
const $canvas = document.createElement("canvas");
const $shopLinks = document.getElementById("shopLinks"); // 링크 요소 가져오기

// 드래그 & 드롭
["dragenter", "dragover"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    $dropArea.classList.add("highlight");
  });
});

["dragleave", "drop"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    $dropArea.classList.remove("highlight");
  });
});

$dropArea.addEventListener("drop", e => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    $file.files = files;
    showPreview(files[0]);
  }
});

$file.addEventListener("change", () => {
  if ($file.files.length > 0) {
    showPreview($file.files[0]);
  }
});

function showPreview(fileOrBlob) {
  const reader = new FileReader();
  reader.onload = e => {
    $preview.onload = () => {
      $scanLine.style.width = $preview.clientWidth + "px";
      $scanLine.style.left = $preview.offsetLeft + "px"; // 이미지 왼쪽 기준 맞춤
    };
    $preview.src = e.target.result;
    $result.textContent = "";
    $resultText.innerHTML = "";
    $shopLinks.style.display = "none"; // 새로운 이미지 올릴 때 링크 숨기기
  };
  reader.readAsDataURL(fileOrBlob);
}

// 서버 업로드 및 예측
$btn.addEventListener("click", async () => {
  let uploadFile = $file.files[0] || $file._cameraBlob;
  if (!uploadFile) {
    alert("이미지를 선택하거나 촬영하세요!");
    return;
  }

  const fd = new FormData();
  fd.append("file", uploadFile);

  $loader.style.display = "inline-block";
  $scanLine.style.display = "block";
  $result.textContent = "";
  $resultText.innerHTML = "";
  $shopLinks.style.display = "none"; // 로딩 중엔 링크 숨김

  try {
    const res = await fetch(API, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "요청 실패");

    if (data.predictions?.length) {
      let text = "Top Predictions:\n";
      data.predictions.forEach((p, i) => {
        text += `${i + 1}. Label: ${p.label} (Score: ${(p.score * 100).toFixed(2)}%)\n`;
      });
      $result.textContent = text;
    } else if (data.error) {
      $result.textContent = "백엔드 에러: " + data.error;
    } else {
      $result.textContent = "예측 결과를 받지 못했습니다.";
    }

    if (data.ko_name) {
      $resultText.innerHTML = `
        <h3>${data.ko_name} (${data.predicted_fabric})</h3>
        <p>🧺 세탁법: ${data.wash_method}</p>
        <p>🌬️ 건조법: ${data.dry_method}</p>
        <p>⚠️ 주의사항: ${data.special_note}</p>
      `;

      // 예측된 재질명으로 쇼핑몰 링크 생성
      const fabricName = data.ko_name || data.predicted_fabric;
      const query = encodeURIComponent(fabricName);

      const shopLinks = [
        {
          name: "네이버 쇼핑",
          url: `https://search.shopping.naver.com/search/all?query=${query}`,
          img: "./images/1.jpg"
        },
        {
          name: "무신사",
          url: `https://www.musinsa.com/search/musinsa/integration?keyword=${query}`,
          img: "./images/2.jpg"
        },
        {
          name: "스파오",
          url: `https://www.spao.com/product/search.html?keyword=${query}`,
          img: "./images/3.jpg"
        }
      ];

      $shopLinks.innerHTML = shopLinks
        .map(link => `
          <a href="${link.url}" target="_blank" class="shop-link">
            <img src="${link.img}" alt="${link.name} 로고">
          </a>
        `)
        .join("");

      $shopLinks.style.display = "flex";
      document.getElementById("shopTitle").style.display = "block"; // AI 추천 표시
    }
  } catch (e) {
    $result.textContent = "에러: " + e.message;
    $resultText.innerText = "에러: " + e.message;
  } finally {
    $loader.style.display = "none";
    $scanLine.style.display = "none";
  }
});

// 카메라 촬영
$cameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    $video.srcObject = stream;
    $video.autoplay = true;
    $video.playsInline = true;
    $video.width = 300;
    $video.height = 200;

    $previewWrapper.innerHTML = "";
    $previewWrapper.appendChild($video);

    // 비디오 메타데이터 로드 완료 대기
    await new Promise(resolve => {
      $video.onloadedmetadata = () => {
        $video.play();
        resolve();
      };
    });

    $captureBtn.className = "capture-circle";
    $previewWrapper.appendChild($captureBtn);

    $captureBtn.addEventListener("click", async () => {
      // video 크기 로드 후 캡처
      $canvas.width = $video.videoWidth;
      $canvas.height = $video.videoHeight;
      $canvas.getContext("2d").drawImage($video, 0, 0);

      const blob = await new Promise(resolve => $canvas.toBlob(resolve, "image/png"));

      // 스트림 종료
      stream.getTracks().forEach(track => track.stop());

      // 미리보기 표시
      $preview.src = URL.createObjectURL(blob);
      $previewWrapper.innerHTML = "";
      $previewWrapper.appendChild($preview);

      // 스캔라인 복원
      $scanLine.className = "scan-line";
      $scanLine.id = "scan-line";
      $previewWrapper.appendChild($scanLine);

      // 바로 예측 실행
      $file._cameraBlob = blob;
      $loader.style.display = "inline-block";
      $scanLine.style.display = "block";
      $btn.click();
    });
  } catch (err) {
    alert("카메라를 사용할 수 없습니다: " + err.message);
  }
});

// 5분마다 서버에 ping 보내기
setInterval(async () => {
  try {
    const res = await fetch("https://backend-6i2t.onrender.com/ping");
    if (res.ok) {
      console.log("서버 ping 성공");
    }
  } catch (err) {
    console.warn("서버 ping 실패:", err);
  }
}, 5 * 60 * 1000); // 5분 = 300,000 ms
*/

const API = "https://backend-6i2t.onrender.com/predict";

const $dropArea = document.getElementById("drop-area");
const $file = document.getElementById("file");
const $preview = document.getElementById("preview");
const $btn = document.getElementById("btn");
const $result = document.getElementById("result");
const $loader = document.getElementById("loading");
const $scanLine = document.querySelector(".scan-line");
const $resultText = document.getElementById("resultText");
const $cameraBtn = document.getElementById("camera-btn");
const $previewWrapper = document.querySelector(".preview-wrapper");
const $captureBtn = document.createElement("div");
const $video = document.createElement("video");
const $canvas = document.createElement("canvas");

// 슬라이드 관련
const $shopSlideContainer = document.getElementById("shopSlideContainer");
const $slideWrapper = document.getElementById("slideWrapper");
const $prevBtn = document.getElementById("prevBtn");
const $nextBtn = document.getElementById("nextBtn");

let slideIndex = 0;
let slideCount = 0;

// 드래그 & 드롭
["dragenter", "dragover"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    $dropArea.classList.add("highlight");
  });
});
["dragleave", "drop"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    $dropArea.classList.remove("highlight");
  });
});
$dropArea.addEventListener("drop", e => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    $file.files = files;
    document.getElementById("shopTitle").style.display = "none";
    showPreview(files[0]);
  }
});
$file.addEventListener("change", () => {
  if ($file.files.length > 0) {
    document.getElementById("shopTitle").style.display = "none";
    showPreview($file.files[0]);
  }
});

function showPreview(fileOrBlob) {
  const reader = new FileReader();
  reader.onload = e => {
    $preview.onload = () => {
      $scanLine.style.width = $preview.clientWidth + "px";
      $scanLine.style.left = $preview.offsetLeft + "px";
    };
    $preview.src = e.target.result;
    $result.textContent = "";
    $resultText.innerHTML = "";
    $shopSlideContainer.style.display = "none";
    document.getElementById("shopTitle").style.display = "none";
  };
  reader.readAsDataURL(fileOrBlob);
}

// 서버 업로드 및 예측
$btn.addEventListener("click", async () => {
  let uploadFile = $file.files[0] || $file._cameraBlob;
  if (!uploadFile) {
    alert("이미지를 선택하거나 촬영하세요!");
    return;
  }

  const fd = new FormData();
  fd.append("file", uploadFile);

  $loader.style.display = "inline-block";
  $scanLine.style.display = "block";
  $result.textContent = "";
  $resultText.innerHTML = "";
  $shopSlideContainer.style.display = "none";
  document.getElementById("shopTitle").style.display = "none";

  try {
    const res = await fetch(API, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "요청 실패");

    // 결과 텍스트
    if (data.predictions?.length) {
      let text = "Top Predictions:\n";
      data.predictions.forEach((p, i) => {
        text += `${i + 1}. Label: ${p.label} (Score: ${(p.score * 100).toFixed(2)}%)\n`;
      });
      $result.textContent = text;
    } else if (data.error) {
      $result.textContent = "백엔드 에러: " + data.error;
    } else {
      $result.textContent = "예측 결과를 받지 못했습니다.";
    }

    if (data.ko_name) {
      $resultText.innerHTML = `
        <h3>${data.ko_name} (${data.predicted_fabric})</h3>
        <p>🧺 세탁법: ${data.wash_method}</p>
        <p>🌬️ 건조법: ${data.dry_method}</p>
        <p>⚠️ 주의사항: ${data.special_note}</p>
      `;

      // 이미지 슬라이드 생성
      const classFolder = data.predicted_fabric;
      const images = [];
      for (let i = 1; i <= 6; i++) {
        images.push(`./images/${classFolder}${i}.png`);
      }

      const links = [
        `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(data.ko_name)}`,
        `https://www.musinsa.com/search/musinsa/integration?keyword=${encodeURIComponent(data.ko_name)}`,
        `https://www.spao.com/product/search.html?keyword=${encodeURIComponent(data.ko_name)}`
      ];

      $slideWrapper.innerHTML = "";
      for (let i = 0; i < links.length; i++) {
        const a = document.createElement("a");
        a.href = links[i];
        a.target = "_blank";
        a.className = "slide-item";

        const img1 = document.createElement("img");
        img1.src = images[i * 2];
        img1.alt = classFolder;
        a.appendChild(img1);

        const img2 = document.createElement("img");
        img2.src = images[i * 2 + 1];
        img2.alt = classFolder;
        a.appendChild(img2);

        $slideWrapper.appendChild(a);
      }

      slideIndex = 0;
      slideCount = $slideWrapper.children.length;
      updateSlide();

      $shopSlideContainer.style.display = "flex";
      document.getElementById("shopTitle").style.display = "block";
    }
  } catch (e) {
    $result.textContent = "에러: " + e.message;
    $resultText.innerText = "에러: " + e.message;
  } finally {
    $loader.style.display = "none";
    $scanLine.style.display = "none";
  }
});

// 슬라이드 컨트롤
function updateSlide() {
  const offset = -slideIndex * 100;
  $slideWrapper.style.transform = `translateX(${offset}%)`;
}

$prevBtn.addEventListener("click", () => {
  slideIndex = (slideIndex - 1 + slideCount) % slideCount;
  updateSlide();
});

$nextBtn.addEventListener("click", () => {
  slideIndex = (slideIndex + 1) % slideCount;
  updateSlide();
});

// 자동 슬라이드 (5초)
setInterval(() => {
  if (slideCount > 0) {
    slideIndex = (slideIndex + 1) % slideCount;
    updateSlide();
  }
}, 5000);

// 카메라 촬영
$cameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    $video.srcObject = stream;
    $video.autoplay = true;
    $video.playsInline = true;
    $video.width = 300;
    $video.height = 200;

    $previewWrapper.innerHTML = "";
    $previewWrapper.appendChild($video);

    await new Promise(resolve => {
      $video.onloadedmetadata = () => {
        $video.play();
        resolve();
      };
    });

    $captureBtn.className = "capture-circle";
    $previewWrapper.appendChild($captureBtn);

    $captureBtn.addEventListener("click", async () => {
      $canvas.width = $video.videoWidth;
      $canvas.height = $video.videoHeight;
      $canvas.getContext("2d").drawImage($video, 0, 0);

      const blob = await new Promise(resolve => $canvas.toBlob(resolve, "image/png"));

      stream.getTracks().forEach(track => track.stop());

      $preview.src = URL.createObjectURL(blob);
      $previewWrapper.innerHTML = "";
      $previewWrapper.appendChild($preview);

      $scanLine.className = "scan-line";
      $scanLine.id = "scan-line";
      $previewWrapper.appendChild($scanLine);

      $file._cameraBlob = blob;
      $loader.style.display = "inline-block";
      $scanLine.style.display = "block";
      $btn.click();
    });
  } catch (err) {
    alert("카메라를 사용할 수 없습니다: " + err.message);
  }
});

// 서버 ping
setInterval(async () => {
  try {
    const res = await fetch("https://backend-6i2t.onrender.com/ping");
    if (res.ok) console.log("서버 ping 성공");
  } catch (err) {
    console.warn("서버 ping 실패:", err);
  }
}, 5 * 60 * 1000);
