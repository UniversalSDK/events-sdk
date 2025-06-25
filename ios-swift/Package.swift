// swift-tools-version: 5.7
import PackageDescription

let package = Package(
    name: "AffiliateSDK",
    platforms: [
        .iOS(.v11),
        .macOS(.v10_13),
        .tvOS(.v11),
        .watchOS(.v4)
    ],
    products: [
        .library(
            name: "AffiliateSDK",
            targets: ["AffiliateSDK"]),
    ],
    dependencies: [
        // No external dependencies to keep the SDK lightweight
    ],
    targets: [
        .target(
            name: "AffiliateSDK",
            dependencies: []),
        .testTarget(
            name: "AffiliateSDKTests",
            dependencies: ["AffiliateSDK"]),
    ]
)