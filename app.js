document.addEventListener("DOMContentLoaded", () => {
  const API = "https://backend-6i2t.onrender.com/predict";

  const $dropArea = document.getElementById("drop-area");
  const $file = document.getElementById("file");
  const $preview = document.getElementById("preview");
  const $btn = document.getElementById("btn");
  const $result = document.getElementById("result");
  const $loader = document.getElementById("loading");
  const $scanLine = document.querySelector(".scan-line");

  // ===== 드래그 앤 드롭 =====
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

  // ===== 파일 선택 시 미리보기 =====
  $file.addEventListener("change", () => {
    if ($file.files.length > 0) {
      showPreview($file.files[0]);
    }
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

  // ===== 서버 업로드 & 예측 =====
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

  $btn.addEventListener("click", () => {
    const f = $file.files[0];
    sendToServer(f);
  });

  // ===== 카메라 기능 =====
  const cameraBtn = document.createElement("button");
  cameraBtn.textContent = "📷 카메라 촬영";
  cameraBtn.className = "upload-btn";
  $dropArea.appendChild(cameraBtn);

  const video = document.createElement("video");
  video.autoplay = true;
  video.style.display = "none";
  $dropArea.appendChild(video);

  let stream;

  cameraBtn.addEventListener("click", async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      video.style.display = "block";
      cameraBtn.textContent = "사진 찍기";
    } catch (err) {
      alert("카메라 접근 실패: " + err.message);
    }

    cameraBtn.onclick = () => {
      // 캡처
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);

      canvas.toBlob(blob => {
        // preview에 표시
        showPreview(blob);
        // 서버 전송
        sendToServer(blob);
      }, "image/png");

      // 비디오 종료
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      video.style.display = "none";
      cameraBtn.textContent = "📷 카메라 촬영";
      cameraBtn.onclick = null; // 다시 클릭 시 새로 getUserMedia
    };
  });
});

