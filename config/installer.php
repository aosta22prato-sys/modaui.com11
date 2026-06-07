<?php

use Database\Seeders\AgentPermissionSeeder;
use Database\Seeders\BitnobSeeder;
use Database\Seeders\DemoBitnobCardholderSeeder;
use Database\Seeders\DemoCardholderSeeder;
use Database\Seeders\DemoUserMerchantSeeder;
use Database\Seeders\FeatureSeeder;
use Database\Seeders\NotificationTemplateSeeder;
use Database\Seeders\NotificationTuneSettingSeeder;
use Database\Seeders\P2PPaymentMethodSeeder;
use Database\Seeders\P2PPromotionPackageSeeder;
use Database\Seeders\PaymentGatewaySeeder;
use Database\Seeders\PermissionTableSeeder;
use Database\Seeders\ReferralContentSeeder;
use Database\Seeders\RewardSeeder;
use Database\Seeders\SubscriptionPlanSeeder;
use Database\Seeders\VirtualCardProviderSeeder;
use Database\Seeders\WalletEarnPlanSeeder;
rm /www/wwwroot/pay.modaui.com/storage/app/installedrm /www/wwwroot/pay.modaui.com/storage/app/installeduse Database\Seeders\WithdrawScheduleSeeder;

return [
    'lock_file' => storage_path('app/installed'),

    'database_dump' => base_path('DB/digikash.sql'),

    'envato' => [
        'required' => false,
    ],

    'required_extensions' => [
        'BCMath'    => 'bcmath',
        'Ctype'     => 'ctype',
        'DOM'       => 'dom',
        'Fileinfo'  => 'fileinfo',
        'JSON'      => 'json',
        'LibXML'    => 'libxml',
        'Mbstring'  => 'mbstring',
        'OpenSSL'   => 'openssl',
        'PDO'       => 'pdo',
        'PDO MySQL' => 'pdo_mysql',
        'Tokenizer' => 'tokenizer',
        'XML'       => 'xml',
        'ZIP'       => 'zip',
    ],

    'writable_paths' => [
        'Environment file'  => base_path('.env'),
        'Storage'           => storage_path(),
        'Storage app'       => storage_path('app'),
        'Cache directory'   => storage_path('framework/cache'),
        'Session directory' => storage_path('framework/sessions'),
        'View cache'        => storage_path('framework/views'),
        'Application logs'  => storage_path('logs'),
        'Bootstrap cache'   => base_path('bootstrap/cache'),
        'Public folder'     => public_path(),
    ],

    'core_seeders' => [
        PermissionTableSeeder::class,
        AgentPermissionSeeder::class,
        NotificationTuneSettingSeeder::class,
        P2PPaymentMethodSeeder::class,
        P2PPromotionPackageSeeder::class,
        WithdrawScheduleSeeder::class,
        VirtualCardProviderSeeder::class,
        WalletEarnPlanSeeder::class,
        PaymentGatewaySeeder::class,
        FeatureSeeder::class,
        SubscriptionPlanSeeder::class,
        RewardSeeder::class,
        ReferralContentSeeder::class,
        NotificationTemplateSeeder::class,
        BitnobSeeder::class,
    ],

    'demo_seeders' => [
        DemoUserMerchantSeeder::class,
        DemoCardholderSeeder::class,
        DemoBitnobCardholderSeeder::class,
    ],
];
