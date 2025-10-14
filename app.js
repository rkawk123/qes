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
    };
    $preview.src = e.target.result;
    $result.textContent = ""; // 예측 텍스트만 초기화
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

  try {
    const res = await fetch(API, { method: "POST", body: fd });
    const data = await res.json();
    console.log("서버 응답:", data); // ✅ 디버그용 로그
    if (!res.ok) throw new Error(data.error || "요청 실패");

    // 예측 결과 출력
    if (data.predictions?.length) {
      $result.textContent =
        "Top Predictions:\n" +
        data.predictions
          .map((p, i) => `${i + 1}. ${p.label} (Score: ${(p.score * 100).toFixed(2)}%)`)
          .join("\n");

      // ✅ 그래프 오류로 전체 중단 방지
      try {
        drawChart(data.predictions);
      } catch (err) {
        console.warn("그래프 그리기 중 오류:", err);
      }
    } else if (data.error) {
      $result.textContent = "백엔드 에러: " + data.error;
    } else {
      $result.textContent = "예측 결과를 받지 못했습니다.";
    }

    // ✅ 세탁정보 출력 (필드 유무와 상관없이 표시)
    if (data.wash_method || data.dry_method || data.special_note || data.ko_name) {
      $resultText.innerHTML = `
        <h3>${data.ko_name || ''} (${data.predicted_fabric || ''})</h3>
        <p>🧺 세탁법: ${data.wash_method || '정보 없음'}</p>
        <p>🌬️ 건조법: ${data.dry_method || '정보 없음'}</p>
        <p>⚠️ 주의사항: ${data.special_note || '정보 없음'}</p>
      `;
    } else {
      $resultText.innerHTML = "";
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

      // 스트림 종료
      stream.getTracks().forEach(track => track.stop());

      $preview.src = URL.createObjectURL(blob);
      $previewWrapper.innerHTML = "";
      $previewWrapper.appendChild($preview);

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

// 서버 ping
setInterval(async () => {
  try {
    const res = await fetch("https://backend-6i2t.onrender.com/ping");
    if (res.ok) console.log("서버 ping 성공");
  } catch (err) {
    console.warn("서버 ping 실패:", err);
  }
}, 5 * 60 * 1000);

// ===== 그래프 시각화 =====
let resultChart = null;
function drawChart(predictions) {
  const canvas = document.getElementById('resultChart');
  if (!canvas) {
    console.warn("resultChart 캔버스를 찾을 수 없습니다.");
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn("canvas context를 가져오지 못했습니다.");
    return;
  }
  if (!predictions?.length) {
    console.warn("예측 결과가 없습니다.");
    return;
  }

  if (resultChart) resultChart.destroy();

  const labels = predictions.map(p => p.label);
  const data = predictions.map(p => (p.score ? (p.score * 100).toFixed(1) : 0));

  resultChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '예측 확률',
        data,
        backgroundColor: [
          'rgba(65,105,225,0.7)',
          'rgba(100,149,237,0.7)',
          'rgba(135,206,250,0.7)'
        ],
        borderColor: ['royalblue', 'cornflowerblue', 'skyblue'],
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `${context.parsed.x}%`
          }
        }
      },
      scales: {
        x: { display: false, grid: { drawTicks: false, drawBorder: false, drawOnChartArea: false } },
        y: { ticks: { font: { size: 14 } }, grid: { drawTicks: false, drawBorder: false } }
      }
    }
  });
}
