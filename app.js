// --- 기존 상단 변수 ---
const API = "https://backend-6i2t.onrender.com/predict";
const $dropArea = document.getElementById("drop-area");
const $file = document.getElementById("file");
const $preview = document.getElementById("preview");
const $btn = document.getElementById("btn");
const $result = document.getElementById("result");
const $loader = document.getElementById("loading");
const $scanLine = document.querySelector(".scan-line");

// --- 새로 추가: 카메라 관련 변수 ---
const $camera = document.getElementById("camera");
const $captureBtn = document.getElementById("captureBtn");
const $snapshot = document.getElementById("snapshot");

// 카메라 켜기
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    $camera.srcObject = stream;
    $camera.style.display = "block";
  } catch (e) {
    alert("카메라를 사용할 수 없습니다: " + e.message);
  }
}

// 사진 찍기
$captureBtn.addEventListener("click", () => {
  const ctx = $snapshot.getContext("2d");
  $snapshot.width = $camera.videoWidth;
  $snapshot.height = $camera.videoHeight;
  ctx.drawImage($camera, 0, 0, $snapshot.width, $snapshot.height);

  // 캡처 이미지를 preview에 표시
  $preview.src = $snapshot.toDataURL("image/png");
  
  // 카메라로 찍은 이미지도 predictFile로 예측
  $snapshot.toBlob(blob => {
    predictFile(blob);
  }, "image/png");
});

// --- 기존 predict 함수 그대로 쓰되 공통으로 사용 가능하게 분리 ---
async function predictFile(file) {
  const fd = new FormData();
  fd.append("file", file);

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

// --- 기존 업로드 버튼 클릭 이벤트는 predictFile 호출하도록 수정 ---
$btn.addEventListener("click", () => {
  const f = $file.files[0];
  if (!f) {
    alert("이미지를 선택하세요!");
    return;
  }
  predictFile(f);
});

// --- 페이지 로드 시 카메라 시작 ---
startCamera();
