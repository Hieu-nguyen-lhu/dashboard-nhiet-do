#include <WiFi.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <WiFiManager.h> // Thêm thư viện WiFiManager
#include "DHT.h"

// --- KHÔNG THAY ĐỔI CẤU HÌNH CHÂN KẾT NỐI VẬT LÝ CỦA BẠN ---
#define DHTPIN 2          
#define DHTTYPE DHT22     
#define DOOR_PIN 3        
#define RELAY_PIN 5       
#define ACS_PIN 0         

#define RELAY_ON  HIGH
#define RELAY_OFF LOW

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80); // Khởi tạo WebServer cổng 80

// Biến lưu thông số cảm biến để gửi lên Web Dashboard
float temperature = 0.0;
float humidity = 0.0;
int doorState = LOW;
float currentVal = 0.0;

unsigned long previousMillis = 0;
const long interval = 2000; 

// Hàm xử lý API Endpoint /data trả về JSON cho Dashboard
void handleDataEndpoint() {
  // Nhận lệnh tắt/bật còi báo động từ giao diện Web
  if (server.hasArg("buzzer")) {
    int buzzerArg = server.arg("buzzer").toInt();
    digitalWrite(RELAY_PIN, buzzerArg ? RELAY_ON : RELAY_OFF);
  }
  
  // Trả về JSON (Cửa tủ: HIGH = Mở = 1, LOW = Đóng = 0)
  String json = "{\n";
  json += "  \"temp\": " + String(temperature, 1) + ",\n";
  json += "  \"hum\": " + String(humidity, 0) + ",\n";
  json += "  \"door\": " + String(doorState == HIGH ? 1 : 0) + ",\n";
  json += "  \"current\": " + String(currentVal, 3) + "\n";
  json += "}";
  
  server.sendHeader("Access-Control-Allow-Origin", "*"); // CORS Header cho phép trình duyệt truy cập
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n====== KHỞI ĐỘNG HỆ THỐNG ======");

  // Khởi tạo các cảm biến và relay
  dht.begin();
  pinMode(DOOR_PIN, INPUT_PULLUP); 
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);

  // KẾT NỐI WI-FI QUA WIFIMANAGER
  WiFiManager wm;
  wm.setConfigPortalTimeout(180); 
  
  if (!wm.autoConnect("ESP32_QuanLyThucPham")) {
    Serial.println("Kết nối thất bại hoặc hết thời gian chờ cấu hình. Đang khởi động lại ESP...");
    delay(3000);
    ESP.restart();
  }

  // Kết nối thành công
  Serial.println("");
  Serial.println("🎉 ĐÃ KẾT NỐI WI-FI THÀNH CÔNG!");
  Serial.print("Địa chỉ IP của ESP32: ");
  Serial.println(WiFi.localIP());
  Serial.println("=================================================");

  // Khởi chạy WebServer
  server.on("/data", HTTP_GET, handleDataEndpoint);
  server.begin();
  Serial.println("HTTP WebServer đã khởi chạy thành công.");
}

void loop() {
  server.handleClient(); // Xử lý các yêu cầu kết nối từ Web Dashboard

  unsigned long currentMillis = millis();
  doorState = digitalRead(DOOR_PIN);

  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    humidity = dht.readHumidity();
    temperature = dht.readTemperature();

    // Đọc ADC từ ACS712 và tính toán dòng điện (Ampe)
    float avgADC = 0;
    for(int i = 0; i < 20; i++) {
      avgADC += analogRead(ACS_PIN);
      delay(1);
    }
    avgADC = avgADC / 20.0;

    // Chuyển đổi giá trị ADC thành dòng điện thực tế (chỉnh offset & độ nhạy của ACS712)
    float adcVolt = (avgADC / 4095.0) * 3.3;
    currentVal = (adcVolt - 1.65) / 0.185; // Cảm biến ACS712 5A (Độ nhạy 185mV/A, offset 1.65V)
    if (currentVal < 0.02) {
      currentVal = 0.0; // Lọc bỏ nhiễu dòng điện nhỏ
    }

    Serial.println("\n--- THÔNG SỐ HỆ THỐNG ---");
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("❌ Lỗi: Không đọc được dữ liệu từ DHT22!");
    } else {
      Serial.print("🌡️ Nhiệt độ: "); Serial.print(temperature, 1); Serial.println(" °C");
      Serial.print("💧 Độ ẩm: "); Serial.print(humidity, 1); Serial.println(" %");
    }

    Serial.print("🚪 Cửa tủ: "); 
    Serial.println((doorState == HIGH) ? "ĐANG MỞ 🔓" : "ĐÃ ĐÓNG 🔒");
    Serial.print("⚡ Dòng điện: "); Serial.print(currentVal, 3); Serial.println(" A");
    Serial.print("📡 Wi-Fi hiện tại: "); Serial.println(WiFi.SSID());
    Serial.print("🌐 Địa chỉ IP ESP32: "); Serial.println(WiFi.localIP());
    Serial.println("-------------------------");

    // Còi báo động vật lý (Buzzer) bây giờ sẽ do Web Dashboard điều khiển hoàn toàn
    // nhằm đảm bảo các nút "Tắt còi" và nút "Tắt âm thanh" hoạt động chính xác.
  }
}