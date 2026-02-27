-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 27, 2026 at 06:41 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `emr-system`
--

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `stored_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_size` int(11) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  `hn` varchar(20) DEFAULT NULL,
  `doctype_id` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `original_name`, `stored_name`, `file_path`, `file_size`, `mime_type`, `uploaded_at`, `hn`, `doctype_id`) VALUES
(2, 'รายงานการจองห้องประชุม.pdf', 'pdf_699eaa884574a0.25218744.pdf', 'uploads/pdf_699eaa884574a0.25218744.pdf', 94454, 'application/pdf', '2026-02-25 14:53:44', '12345', ' 3'),
(3, 'รายงานการจองห_องประช_ม.pdf', 'pdf_699fb99a3c2108.05135866.pdf', 'uploads/pdf_699fb99a3c2108.05135866.pdf', 94454, 'application/pdf', '2026-02-26 10:10:18', '12345', '4'),
(4, '35804202T07.pdf', 'pdf_699fb9a9c08625.89340242.pdf', 'uploads/pdf_699fb9a9c08625.89340242.pdf', 2874252, 'application/pdf', '2026-02-26 10:10:33', '12345', '5'),
(5, '3 5408472T07.pdf', 'pdf_699fc14881a177.21192479.pdf', 'uploads/pdf_699fc14881a177.21192479.pdf', 43851832, 'application/pdf', '2026-02-26 10:43:04', '12345', '6'),
(6, '35408472T07.pdf', 'pdf_69a12e13217c93.00908989.pdf', 'uploads/pdf_69a12e13217c93.00908989.pdf', 43851832, 'application/pdf', '2026-02-27 12:39:31', '123456789', '16');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_hn_doctype` (`hn`,`doctype_id`),
  ADD KEY `doctype_id` (`doctype_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
