# 0Fi

A modern, freedom, fastly, easy-to-use,**0 Depends FancyIndex-Theme**.

## 🚀 Features

Forked from <https://github.com/Naereen/Nginx-Fancyindex-Theme>

- A beautiful UI to get file fast any easy.
- Support **Light and Dark** theme and aslo have autochange. No flash when open.
- Search, and the word stay in URL so you can share it.
- Copy page URL in one click. File link just right click the name.
- Just only **3 steps** to depoly in any can install nginx fancyindex devices.
- Release is minify! End file size still so small.

## 🔧 How to use

> If you not using Debian GNU/Linux and software source not have fancyindex module, Please try to self build nginx and addital fancyindex module.
>
> Make sure you are riding at `/var/www/html`

### ⬇️ Install for Debian:

> For based on Fedora, change pm to dnf/rpm and install `nginx-mod-fancyindex`.
>
> You must be already at /var/www/html or nginx root dictionary.
>
> And from line 3 next.

```bash
apt update
apt install wget nginx libnginx-mod-http-fancyindex
rm -rf 0fi/
mkdir -p 0fi/
cd 0fi/
wget https://github.com/moaeiou/0fi/releases/latest/download/0fi.tar.zst
tar -xvf 0fi.tar.zst
rm 0fi.tar.zst
cd ..
```

### ⬆️ Update

```bash
rm -rf fancyindex-theme/
mkdir -p fancyindex-theme/
cd fancyindex-theme/
wget https://github.com/moaeiou/0fi/releases/latest/download/0fi.tar.zst
tar -xvf 0fi.tar.zst
rm 0fi.tar.zst
cd ..
```

### 📶 Nginx

> Include the `fancyindex` module first, add it in the header of nginx config

```ini
include /etc/nginx/modules-enabled/*.conf;
```

> `location` part.

```ini
location ^~ / {
    alias /var/www/html/;
    include mime.types;
    default_type application/octet-stream;
    fancyindex on;
    fancyindex_localtime on;
    fancyindex_show_path off;
    fancyindex_exact_size off;
    fancyindex_header "/0fi/header.html";
    fancyindex_footer "/0fi/footer.html";
    fancyindex_ignore "0fi";
}
```

> Validate and reload the configuration:

```bash
nginx -t
systemctl reload nginx
```

## ⚖️ LICENSE

This project licensed under the [MoPL](https://867678.xyz/docs/mopl).

The source licensed under the MIT and Copyright © 2016-17 Lilian Besson [Naereen](https://github.com/Naereen)
