# Security Policy

## Versi yang didukung

Perbaikan keamanan diterapkan pada commit terbaru di branch `main`. Rilis lama
tidak dijamin menerima backport.

## Melaporkan kerentanan

Jangan membuka issue publik, diskusi, atau pull request untuk kerentanan yang
belum diperbaiki.

Gunakan **GitHub private vulnerability reporting** pada tab **Security** di
repositori ini. Kan alur ini tersedia melalui tombol **Report a vulnerability**
dan hanya dapat dilihat oleh pemilik repositori.

Jika tombol tersebut belum aktif, hubungi pemilik repositori melalui profil
GitHub-nya. Jangan mengirim detail kerentanan melalui issue publik.

## Cakupan

Laporan yang relevan mencakup, antara lain:

- autentikasi, manajemen sesi, dan otorisasi peran;
- kebocoran data melalui API, laporan, atau export CSV;
- injeksi, cross-site scripting, dan cross-site request forgery;
- kelemahan pada konfigurasi cookie, CORS, atau header keamanan;
- kebocoran secret atau kredensial;
- dependency dengan kerentanan yang berdampak pada aplikasi.

## Proses

- Kami berupaya mengonfirmasi laporan dalam 3 hari kerja.
- Kami akan menilai dampak, menyiapkan perbaikan, dan memberi tahu pelapor saat
  perbaikan tersedia.
- Mohon beri waktu yang wajar sebelum publikasi detail teknis.
- Saat ini tidak ada program bug bounty atau imbalan finansial.
