# 概要

[Qiita記事「CloudFront＆Lambda@Edgeで画像リサイズする構成のSAMテンプレートを作成してみた」](https://github.com/chs-k-kinoshita/sam-resizeImgWithEdge)用のリソース一式です。  
[Amazon CloudFront & Lambda@Edge で画像をリサイズする](https://aws.amazon.com/jp/blogs/news/resizing-images-with-amazon-cloudfront-lambdaedge-aws-cdn-blog/)の構成をSAMのテンプレートで一括で構築してみています。

# 構築手順

SAM CLIとDockerが利用できてAdmin相当のIAM権限が必要です。  
Cloud9環境の利用を推奨します。

## S3バケット名の修正

"samconfig.toml"ファイルの"XXXXXX"部分（OriginS3BucketNameパラメータ値）を任意のバケット名に置換して保存します。
```
parameter_overrides = "OriginS3BucketName=XXXXXX OriginS3BucketCreation=true"
```

## ビルド

samのコマンドでビルドします。  
コマンドの実行は"template.yaml"ファイルが存在するディレクトリ上に移動して実行します。
```
sam build --use-container
```

※ Cloud9環境でディスク容量不足でビルドが失敗する場合は下記記事を参考にEBSのサイズを20Gなどに拡張します。  
[環境で使用されている Amazon EBS ボリュームのサイズ変更](https://docs.aws.amazon.com/ja_jp/cloud9/latest/user-guide/move-environment.html#move-environment-resize)

## デプロイ

```
sam deploy
```
or
```
sam deploy --resolve-s3
```
