#include <WiFi.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <WiFiManager.h> // Thêm thư viện WiFiManager
#include "DHT.h"

#define DHTPIN 2          
#define DHTTYPE DHT22     
#define DOOR_PIN 3        
#define RELAY_PIN 5       
#define ACS_PIN 0         

#define RELAY_ON  HIGH
#define RELAY_OFF LOW

DHT dht(DHTPIN, DHTTYPE);
unsigned long previousMillis = 0;
const long interval = 2000; 

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n====== KHỞI ĐỘNG HỆ THỐNG ======");

  // Khởi tạo các cảm biến và relay
  dht.begin();
  pinMode(DOOR_PIN, INPUT_PULLUP); 
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);

  // ---------------- KẾT NỐI WI-FI QUA WIFIMANAGER ----------------
  WiFiManager wm;

  // Xóa cấu hình cũ để test thử tính năng phát WiFi (Nếu cần test thì bỏ comment dòng dưới)
  // wm.resetSettings(); 

  Serial.println("Đang kiểm tra Wi-Fi cũ hoặc cấu hình mạng mới...");
  
  // Hàm này sẽ tự động chạy:
  // 1. Cố gắng kết nối với Wi-Fi đã lưu trước đó.
  // 2. Nếu thất bại hoặc không có, nó sẽ tự phát Wi-Fi tên "ESP32_QuanLyThucPham"
  // 3. Nó sẽ chặn code ở đây (đợi người dùng kết nối cấu hình) trong vòng 180 giây (3 phút) rồi tự reset nếu quá hạn.
  wm.setConfigPortalTimeout(180); 
  
  if (!wm.autoConnect("ESP32_QuanLyThucPham")) {
    Serial.println("Kết nối thất bại hoặc hết thời gian chờ cấu hình. Đang khởi động lại ESP...");
    delay(3000);
    ESP.restart();
  }

  // Nếu kết nối thành công, code sẽ chạy xuống đây
  Serial.println("");
  Serial.println("🎉 ĐÃ KẾT NỐI WI-FI THÀNH CÔNG!");
  Serial.print("Địa chỉ IP của ESP32: ");
  Serial.println(WiFi.localIP());
  Serial.println("=================================================");
}

void loop() {
  // Nếu mất kết nối Wi-Fi đột ngột khi đang chạy, bạn có thể tự xử lý reconnect hoặc kệ nó,
  // khi reset lại nguồn WiFiManager sẽ tự động lo lại từ đầu ở hàm setup.

  unsigned long currentMillis = millis();
  int doorState = digitalRead(DOOR_PIN);

  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    // Đọc ADC từ ACS712
    float avgADC = 0;
    for(int i = 0; i < 20; i++) {
      avgADC += analogRead(ACS_PIN);
      delay(1);
    }
    avgADC = avgADC / 20.0;

    Serial.println("\n--- THÔNG SỐ HỆ THỐNG ---");
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("❌ Lỗi: Không đọc được dữ liệu từ DHT22!");
    } else {
      Serial.print("🌡️ Nhiệt độ: "); Serial.print(temperature, 1); Serial.println(" °C");
      Serial.print("💧 Độ ẩm: "); Serial.print(humidity, 1); Serial.println(" %");
    }

    Serial.print("🚪 Cửa tủ: "); 
    Serial.println((doorState == HIGH) ? "ĐANG MỞ 🔓" : "ĐÃ ĐÓNG 🔒");
    Serial.print("📡 Wi-Fi hiện tại: "); Serial.println(WiFi.SSID());
    Serial.println("-------------------------");

    // Kịch bản còi kêu khi mở cửa để test
    if (doorState == HIGH) {
      digitalWrite(RELAY_PIN, RELAY_ON);
      delay(300); 
      digitalWrite(RELAY_PIN, RELAY_OFF);
    }
  }
}