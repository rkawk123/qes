document.addEventListener("DOMContentLoaded", () => {
  const API = "https://backend-6i2t.onrender.com/predict";

  const $dropArea = document.getElementById("drop-area");
  const $file = document.getElementById("file");
  const $preview = document.getElementById("preview");
  const $result = document.getElementById("result");
  const $loader = document.getElementById("loading");
  const $scanLine = document.querySelector(".scan-line");

  // ===== 드래그 앤 드롭 / 파일 업로드 =====
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
    if ($file.files.length > 0) showPreview($file.files[0]);
  });

  function showPreview(file) {
    const reader = new FileReader();
    reader.onload = e => {
      $preview.onload = () => {
        $scanLine.style.width = $preview.clientWidth + "px";
      };
      $preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function sendToServer(file) {
    if (!file) {
      alert("이미지를 선택하세요!");
      return;
    }
    const fd = new FormData();
    fd.append("file", file, "image.png");

    $loader.style.display = "inline-block";
    $scanLine.style.display = "block";
    $result.textContent = "";

    try {
      const res = await fetch(API, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "요청 실패");

      if (json.predictions && json.predictions.length > 0) {
        let text = "Top Predictions:\n";
        json.predictions.forEach((p, idx) => {
          text += `${idx + 1}. Label: ${p.label}\n`;
        });
        $result.textContent = text;
      } else if (json.error) {
        $result.textContent = "백엔드 에러: " + json.error;
      } else {
        $result.textContent = "예측 결과를 받지 못했습니다.";
      }
    } catch (e) {
      $result.textContent = "에러: " + e.message;
    } finally {
      $loader.style.display = "none";
      $scanLine.style.display = "none";
    }
  }

  // ===== 업로드 예측 버튼 =====
  const $btn = document.createElement("button");
  $btn.textContent = "▶ 예측하기";
  $btn.className = "predict-btn";
  $dropArea.parentElement.querySelector(".footer").prepend($btn);

  $btn.addEventListener("click", () => {
    const f = $file.files[0];
    sendToServer(f);
  });

  // ===== 카메라 기능 (화면 터치 초점 + 하단 원 버튼) =====
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.style.display = "block";
  video.style.width = "100%";
  video.style.borderRadius = "6px";
  $dropArea.appendChild(video);

  const focusCircle = document.createElement("div");
  focusCircle.style.position = "absolute";
  focusCircle.style.width = "60px";
  focusCircle.style.height = "60px";
  focusCircle.style.border = "2px solid white";
  focusCircle.style.borderRadius = "50%";
  focusCircle.style.pointerEvents = "none";
  focusCircle.style.display = "none";
  $dropArea.appendChild(focusCircle);

  const captureBtn = document.createElement("div");
  captureBtn.style.position = "absolute";
  captureBtn.style.bottom = "15px";
  captureBtn.style.left = "50%";
  captureBtn.style.transform = "translateX(-50%)";
  captureBtn.style.width = "60px";
  captureBtn.style.height = "60px";
  captureBtn.style.border = "3px solid white";
  captureBtn.style.borderRadius = "50%";
  captureBtn.style.background = "rgba(255,255,255,0.2)";
  captureBtn.style.cursor = "pointer";
  $dropArea.appendChild(captureBtn);

  let stream;
  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } }
      });
      video.srcObject = stream;
    } catch (err) {
      console.warn("후면 카메라 실패, 기본 카메라 시도:", err.message);
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
    }
  }
  startCamera();

  // 터치 시 초점 표시
  video.addEventListener("click", e => {
    const rect = video.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    focusCircle.style.left = `${x - 30}px`;
    focusCircle.style.top = `${y - 30}px`;
    focusCircle.style.display = "block";
    setTimeout(() => (focusCircle.style.display = "none"), 800);
  });

  // 캡처 버튼 클릭
  captureBtn.addEventListener("click", () => {
    if (!stream) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      showPreview(blob);
      sendToServer(blob);
    }, "image/png");
  });
});
