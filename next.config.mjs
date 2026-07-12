/** @type {import('next').NextConfig} */
const nextConfig = {
  // 빌드 시 ESLint 경고가 있어도 무시하고 배포 진행
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 빌드 시 타입스크립트 에러가 있어도 무시하고 배포 진행
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
