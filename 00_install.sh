# Оновлюємо існуюче середовище
sudo apt-get update
sudo apt-get upgrade

# Встановлюємо NodeJS
sudo apt-get install curl python-software-properties
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install -y nodejs

# Встановлюємо Elasticsearch
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
sudo sh -c 'echo "deb https://artifacts.elastic.co/packages/7.x/apt stable main" > /etc/apt/sources.list.d/elastic-7.x.list'
sudo apt-get update
sudo apt-get install elasticsearch

# Встановлюємо плагін для роботи з українською мовою
sudo /usr/share/elasticsearch/bin/elasticsearch-plugin install analysis-ukrainian

# Запускаємо Elasticearch
sudo systemctl start elasticsearch

# Встановлюємо GIT
sudo apt-get install git

# Копіюємо репозиторій з кодом
git clone git@github.com:Amice13/klh-ccu-bot.git
cd klh-ccu-bot

# Завантажуємо необхідні модулі
npm install

# Встановлюємо сертифікат безпеки
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
sudo apt-get install certbot
sudo certbot certonly --standalone -d example.com -d www.example.com
