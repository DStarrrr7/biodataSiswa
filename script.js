
"use strict";

// 1. KONFIGURASI SUPABASE
// Ganti URL dengan Project URL dari dashboard Supabase.
const SUPABASE_URL = "https://lrcqmfojorrtnhnsufyr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_koQMsXJ0Frd2MBU4_a6V_A_z1lP9QQg";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// 2. REFERENSI ELEMEN HTML
const elDaftar = document.getElementById("daftar");
const elJumlah = document.getElementById("jumlah");
const elCari = document.getElementById("cari");
const elKelas = document.getElementById("filterKelas");
const modal = document.getElementById("modalSiswa");
const form = document.getElementById("formSiswa");
const btnSimpan = document.getElementById("btnSimpan");

const TAMPILKAN = {
    jenisKelamin: true,
    tanggalLahir: true,
    alamat: true
};

let semuaSiswa = [];

// 3. MEMUAT DATA DARI SUPABASE
async function muatData() {
    tampilkanPesan("Memuat data siswa...");

    const { data, error } = await db
        .from("siswa")
        .select("nis, nama, kelas, jenis_kelamin, tanggal_lahir, alamat, foto_url")
        .order("nama", { ascending: true });

    if (error) {
        console.error("Gagal memuat data:", error);
        tampilkanPesan(
            "Data tidak bisa dimuat. Periksa URL, API key, nama tabel, dan RLS.",
            true
        );
        elJumlah.textContent = "";
        return;
    }

    semuaSiswa = data || [];
    isiPilihanKelas();
    tampilkanSiswa();
}

// 4. PENCARIAN DAN FILTER
function tampilkanSiswa() {
    const kataKunci = elCari.value.trim().toLowerCase();
    const kelasDipilih = elKelas.value;

    const hasil = semuaSiswa.filter((s) => {
        const cocokNama = (s.nama || "").toLowerCase()
            .includes(kataKunci);
        const cocokNis = String(s.nis || "").toLowerCase()
            .includes(kataKunci);
        const cocokKelas =
            !kelasDipilih || s.kelas === kelasDipilih;

        return cocokKelas &&
            (!kataKunci || cocokNama || cocokNis);
    });

    elJumlah.textContent =
        `${hasil.length} dari ${semuaSiswa.length} siswa`;

    elDaftar.replaceChildren();

    if (hasil.length === 0) {
        tampilkanPesan(
            semuaSiswa.length === 0
                ? "Belum ada data siswa. Klik Tambah Siswa untuk mengisi."
                : "Tidak ada siswa yang cocok."
        );
        return;
    }

    hasil.forEach((s) => {
        elDaftar.appendChild(buatKartu(s));
    });
}

// 5. MEMBUAT KARTU SISWA
function buatKartu(s) {
    const kartu = el("article", "kartu");
    const hue = warnaKelas(s.kelas);

    const pita = el("div", "pita");
    pita.style.backgroundColor = `hsl(${hue}, 65%, 45%)`;
    kartu.appendChild(pita);

    const isi = el("div", "isi");
    const foto = el("div", "foto");

    foto.style.backgroundColor = `hsl(${hue}, 55%, 88%)`;
    foto.style.color = `hsl(${hue}, 65%, 28%)`;

    if (s.foto_url && urlFotoValid(s.foto_url)) {
        const gambar = document.createElement("img");
        gambar.src = s.foto_url;
        gambar.alt = `Foto ${s.nama}`;
        gambar.loading = "lazy";

        gambar.onerror = () => {
            foto.replaceChildren(
                document.createTextNode(inisial(s.nama))
            );
        };

        foto.appendChild(gambar);
    } else {
        foto.textContent = inisial(s.nama);
    }

    isi.appendChild(foto);
    isi.appendChild(el("h2", "nama", s.nama));
    isi.appendChild(el("p", "nis", `NIS ${s.nis}`));

    const rincian = el("dl", "rincian");

    tambahBaris(rincian, "Kelas", s.kelas);

    if (TAMPILKAN.jenisKelamin) {
        tambahBaris(rincian, "Jenis kelamin", s.jenis_kelamin);
    }

    if (TAMPILKAN.tanggalLahir) {
        tambahBaris(
            rincian, "Tanggal lahir", formatTanggal(s.tanggal_lahir)
        );
    }

    if (TAMPILKAN.alamat) {
        tambahBaris(rincian, "Alamat", s.alamat);
    }

    isi.appendChild(rincian);
    kartu.appendChild(isi);

    const aksi = el("div", "kartu-aksi");

    const btnEdit = el("button", "btn-edit", "✏️ Edit");
    btnEdit.type = "button";
    btnEdit.onclick = () => bukaModalEdit(s);

    const btnHapus = el("button", "btn-hapus", "🗑️ Hapus");
    btnHapus.type = "button";
    btnHapus.onclick = () => hapusSiswa(s.nis, s.nama);

    aksi.append(btnEdit, btnHapus);
    kartu.appendChild(aksi);

    return kartu;
}

// 6. MEMBUKA FORM TAMBAH
function bukaModalTambah() {
    form.reset();

    document.getElementById("modalJudul").textContent =
        "Tambah Data Siswa";

    document.getElementById("formAction").value = "INSERT";
    document.getElementById("originalNis").value = "";

    const inputNis = document.getElementById("inputNis");
    inputNis.disabled = false;

    modal.style.display = "grid";
    inputNis.focus();
}

// 7. MEMBUKA FORM EDIT
function bukaModalEdit(s) {
    form.reset();

    document.getElementById("modalJudul").textContent =
        "Edit Data Siswa";

    document.getElementById("formAction").value = "UPDATE";
    document.getElementById("originalNis").value = s.nis;

    document.getElementById("inputNis").value = s.nis;
    document.getElementById("inputNis").disabled = true;
    document.getElementById("inputNama").value = s.nama || "";
    document.getElementById("inputKelas").value = s.kelas || "";
    document.getElementById("inputGender").value =
        s.jenis_kelamin || "";
    document.getElementById("inputLahir").value =
        s.tanggal_lahir || "";
    document.getElementById("inputAlamat").value = s.alamat || "";
    document.getElementById("inputFoto").value = s.foto_url || "";

    modal.style.display = "grid";
    document.getElementById("inputNama").focus();
}

// 8. MENUTUP MODAL
function tutupModal() {
    modal.style.display = "none";
    form.reset();
    document.getElementById("inputNis").disabled = false;
}

// 9. MENAMBAH DAN MEMPERBARUI DATA
async function simpanDataSiswa(event) {
    event.preventDefault();

    const action = document.getElementById("formAction").value;

    const nis = document.getElementById("inputNis").value.trim();
    const nama = document.getElementById("inputNama").value.trim();
    const kelas = document.getElementById("inputKelas").value.trim();
    const jenis_kelamin =
        document.getElementById("inputGender").value;
    const tanggal_lahir =
        document.getElementById("inputLahir").value || null;
    const alamat = document.getElementById("inputAlamat").value.trim();
    const fotoInput = document.getElementById("inputFoto").value.trim();

    if (!nis || !nama) {
        alert("NIS dan nama lengkap wajib diisi.");
        return;
    }

    if (fotoInput && !urlFotoValid(fotoInput)) {
        alert("URL foto harus menggunakan alamat HTTP atau HTTPS yang valid.");
        return;
    }

    const payload = {
        nis,
        nama,
        kelas: kelas || null,
        jenis_kelamin: jenis_kelamin || null,
        tanggal_lahir,
        alamat: alamat || null,
        foto_url: fotoInput || null
    };

    btnSimpan.disabled = true;
    btnSimpan.textContent = "Menyimpan...";

    try {
        let error;

        if (action === "INSERT") {
            ({ error } = await db.from("siswa").insert([payload]));
        } else if (action === "UPDATE") {
            const originalNis =
                document.getElementById("originalNis").value;

            ({ error } = await db
                .from("siswa")
                .update(payload)
                .eq("nis", originalNis));
        }

        if (error) {
            console.error("Gagal menyimpan:", error);
            alert("Gagal menyimpan data: " + error.message);
            return;
        }

        tutupModal();
        await muatData();
    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
        btnSimpan.disabled = false;
        btnSimpan.textContent = "Simpan Data";
    }
}

// 10. MENGHAPUS DATA
async function hapusSiswa(nis, nama) {
    const yakin = confirm(
        `Apakah Anda yakin ingin menghapus data "${nama}"?`
    );

    if (!yakin) return;

    const { error } = await db
        .from("siswa")
        .delete()
        .eq("nis", nis);

    if (error) {
        console.error("Gagal menghapus:", error);
        alert("Gagal menghapus data: " + error.message);
        return;
    }

    await muatData();
}

// 11. FUNGSI PEMBANTU
function el(tag, kelas = "", teks = "") {
    const elemen = document.createElement(tag);

    if (kelas) elemen.className = kelas;
    if (teks !== "") elemen.textContent = teks;

    return elemen;
}

function tambahBaris(dl, label, nilai) {
    if (nilai === null || nilai === undefined || nilai === "") {
        return;
    }

    const baris = el("div");
    baris.append(
        el("dt", "", label),
        el("dd", "", String(nilai))
    );

    dl.appendChild(baris);
}

function inisial(nama = "") {
    return nama.trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((kata) => kata[0].toUpperCase())
        .join("");
}

function warnaKelas(kelas = "") {
    let total = 0;

    for (const huruf of kelas) {
        total += huruf.charCodeAt(0);
    }

    return (total * 47) % 360;
}

function formatTanggal(teks) {
    if (!teks) return "";

    const tanggal = new Date(`${teks}T00:00:00`);

    if (Number.isNaN(tanggal.getTime())) return teks;

    return tanggal.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function urlFotoValid(teks) {
    try {
        const url = new URL(teks);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

function tampilkanPesan(teks, galat = false) {
    elDaftar.replaceChildren(
        el("p", `pesan${galat ? " galat" : ""}`, teks)
    );
}

function isiPilihanKelas() {
    elKelas.replaceChildren(
        el("option", "", "Semua kelas")
    );

    const daftarKelas = [
        ...new Set(
            semuaSiswa.map((s) => s.kelas).filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b, "id"));

    daftarKelas.forEach((kelas) => {
        const opsi = el("option", "", kelas);
        opsi.value = kelas;
        elKelas.appendChild(opsi);
    });
}

// 12. EVENT LISTENER
document.getElementById("btnTambah")
    .addEventListener("click", bukaModalTambah);

document.getElementById("btnBatal")
    .addEventListener("click", tutupModal);

form.addEventListener("submit", simpanDataSiswa);

elCari.addEventListener("input", tampilkanSiswa);
elKelas.addEventListener("change", tampilkanSiswa);

modal.addEventListener("click", (event) => {
    if (event.target === modal) tutupModal();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.style.display === "grid") {
        tutupModal();
    }
});

// 13. JALANKAN APLIKASI
muatData();
