#!/bin/bash

# 檢查是否提供了使用者名稱參數
if [ -z "$1" ]; then
  echo "錯誤：未提供使用者名稱。"
  echo "用法: $0 <username>"
  exit 1
fi

# 從參數讀取使用者名稱
USERNAME=$1
# API 端點 URL (預設為本地開發伺服器)
API_URL="https://purple-water-b776.zzlee-tw.workers.dev/api/users"

echo "正在嘗試建立使用者 '$USERNAME'..."

# 使用 curl 發送 POST 請求
# -s: silent 模式，不顯示進度條
# -X POST: 指定請求方法為 POST
# -H "Content-Type: application/json": 設定請求標頭
# -d: 指定請求的 body 內容
# -w "\nHTTP Status: %{http_code}\n": 在請求結束後印出 HTTP 狀態碼
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$USERNAME\"}" \
  -w "\nHTTP Status: %{http_code}\n" \
  "$API_URL"

echo "完成。"

