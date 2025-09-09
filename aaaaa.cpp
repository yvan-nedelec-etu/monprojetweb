#include <iostream>
#include <string>
#include <vector>
#include <thread>
#include <atomic>
#include <mutex>
#include <chrono>
#include <iomanip>

#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

static std::mutex io_mtx;

size_t writeCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    ((std::string*)userp)->append((char*)contents, size * nmemb);
    return size * nmemb;
}

std::string fetchUrl(const std::string& url) {
    CURL* curl = curl_easy_init();
    if (!curl) throw std::runtime_error("curl init failed");
    std::string response;
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_USERAGENT, "cpp-console-app/1.0");
    CURLcode res = curl_easy_perform(curl);
    long status = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);
    curl_easy_cleanup(curl);
    if (res != CURLE_OK) {
        throw std::runtime_error(std::string("curl error: ") + curl_easy_strerror(res));
    }
    if (status < 200 || status >= 300) {
        throw std::runtime_error("HTTP error: " + std::to_string(status));
    }
    return response;
}

struct User { std::string name, username, email; };

std::vector<User> parseUsers(const std::string& body) {
    auto j = json::parse(body);
    std::vector<User> out;
    if (!j.is_array()) return out;
    for (const auto& it : j) {
        User u;
        u.name = it.value("name", "");
        u.username = it.value("username", "");
        u.email = it.value("email", "");
        out.push_back(u);
    }
    return out;
}

void printTable(const std::vector<User>& users) {
    std::lock_guard<std::mutex> lk(io_mtx);
    const int w1 = 30, w2 = 20, w3 = 30;
    std::cout << std::left << std::setw(w1) << "Name"
              << std::setw(w2) << "User name"
              << std::setw(w3) << "Email" << "\n";
    std::cout << std::string(w1 + w2 + w3, '-') << "\n";
    for (const auto& u : users) {
        std::cout << std::left << std::setw(w1) << u.name
                  << std::setw(w2) << u.username
                  << std::setw(w3) << u.email << "\n";
    }
    std::cout << std::endl;
}

void clockThread(std::atomic<bool>& run) {
    while (run) {
        {
            std::lock_guard<std::mutex> lk(io_mtx);
            auto now = std::chrono::system_clock::now();
            std::time_t t = std::chrono::system_clock::to_time_t(now);
            std::tm tm;
#if defined(_WIN32)
            localtime_s(&tm, &t);
#else
            localtime_r(&t, &tm);
#endif
            std::cout << "\rHeure actuelle : " << std::put_time(&tm, "%H:%M:%S") << "      " << std::flush;
        }
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
}

void shakerThread(std::atomic<bool>& run, std::atomic<bool>& shaking, const std::string& name) {
    int step = 0;
    while (run) {
        if (shaking) {
            std::lock_guard<std::mutex> lk(io_mtx);
            std::cout << "\n[" << name << "] SHAKE (" << (step++ % 4) << ")\n";
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
}

int main() {
    std::cout << "Console App - récupération utilisateurs (jsonplaceholder) \n";
    std::atomic<bool> run{true};
    std::atomic<bool> shakeImage{false}, shakeTable{false};

    std::thread clk(clockThread, std::ref(run));
    std::thread sImg(shakerThread, std::ref(run), std::ref(shakeImage), "IMAGE");
    std::thread sTbl(shakerThread, std::ref(run), std::ref(shakeTable), "TABLE");

    std::vector<User> users;
    auto doLoad = [&users]() {
        try {
            std::string body = fetchUrl("https://jsonplaceholder.typicode.com/users");
            users = parseUsers(body);
            if (users.empty()) {
                std::lock_guard<std::mutex> lk(io_mtx);
                std::cout << "\nAucun utilisateur trouvé.\n";
            } else {
                printTable(users);
            }
        } catch (const std::exception& ex) {
            std::lock_guard<std::mutex> lk(io_mtx);
            std::cout << "\nErreur lors du chargement des utilisateurs : " << ex.what() << "\n";
        }
    };

    doLoad();

    // simple REPL
    while (true) {
        {
            std::lock_guard<std::mutex> lk(io_mtx);
            std::cout << "\nCommandes: reload | toggle image | toggle table | quit\n> " << std::flush;
        }
        std::string cmd;
        if (!std::getline(std::cin, cmd)) break;
        if (cmd == "reload") {
            doLoad();
        } else if (cmd == "toggle image") {
            shakeImage = !shakeImage;
            std::lock_guard<std::mutex> lk(io_mtx);
            std::cout << (shakeImage ? "Image: started shaking\n" : "Image: stopped shaking\n");
        } else if (cmd == "toggle table") {
            shakeTable = !shakeTable;
            std::lock_guard<std::mutex> lk(io_mtx);
            std::cout << (shakeTable ? "Table: started shaking\n" : "Table: stopped shaking\n");
        } else if (cmd == "quit") {
            break;
        } else if (cmd.empty()) {
            continue;
        } else {
            std::lock_guard<std::mutex> lk(io_mtx);
            std::cout << "Commande inconnue\n";
        }
    }

    run = false;
    if (clk.joinable()) clk.join();
    if (sImg.joinable()) sImg.join();
    if (sTbl.joinable()) sTbl.join();

    std::cout << "Bye\n";
    return 0;
}