/*
Copyright (c) 2017-2019 Tony Pottier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

@file main.c
@author Tony Pottier
@brief Entry point for the ESP32 application.
@see https://idyl.io
@see https://github.com/tonyp7/esp32-wifi-manager
*/

#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_system.h"
#include "esp_log.h"
#include "wifi_manager.h"

/* @brief tag used for ESP serial console messages */
static const char TAG[] = "main";

/**
 * @brief RTOS task that periodically prints the heap memory available.
 * @note Pure debug information, should not be ever started on production code! This is an example on how you can integrate your code with wifi-manager
 */
void monitoring_task(void *pvParameter)
{
	for(;;){
		ESP_LOGI(TAG, "free heap: %d",esp_get_free_heap_size());
		vTaskDelay( pdMS_TO_TICKS(10000) );
	}
}


/* brief this is an exemple of a callback that you can setup in your own app to get notified of wifi manager event */
void cb_connection_ok(void *pvParameter){
	ESP_LOGI(TAG, "I have a connection!");
	//wifi_manager_disconnect_and_delete_config_async();
}

void cb_setting_update(const custom_setting_t* setting) {
	ESP_LOGI(TAG, "New setting! %s: %s", setting->key, setting->value);
}

void app_main()
{
	// Add custom settings to be configured
	add_custom_setting("token", "text", "Enter your secret token", NULL, 33,
		NULL, &cb_setting_update);
	add_custom_setting("service", "select", "Select a service", NULL, 5,
		"svc1\tService #1\nsvc2\tService #2\nsvc3\tService #3",
		&cb_setting_update);
	add_custom_setting("color", "radio", "Color", "green", 6,
		"red\tRed\ngreen\tGreen\nblue\tBlue",
		&cb_setting_update);

	/* start the wifi manager */
	wifi_manager_start();

	/* register a callback as an example to how you can integrate your code with the wifi manager */
	wifi_manager_set_callback(EVENT_STA_GOT_IP, &cb_connection_ok);

	/* your code should go here. Here we simply create a task on core 2 that monitors free heap memory */
	xTaskCreatePinnedToCore(&monitoring_task, "monitoring_task", 2048, NULL, 1, NULL, 1);
}
