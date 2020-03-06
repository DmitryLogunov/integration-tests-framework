Feature: Assets-gateway tests

  Scenario: Send upload file request
    When send upload file request

  Scenario: Send download file request
    When send download file request

  Scenario: Send upload request using wrong auth token
    When send an upload request using wrong auth token

  Scenario: Send download request using wrong auth token
    When send a download request using wrong auth token

  Scenario Outline: Send upload file request with wrong file data
    When send upload file request without "<property>"
    Then expected response status <code> and message "<message>"

    Examples:
    | property | code        | message                                  |
    | filename | 500         | Error uploading file: File name required |
    | type     | 500         | Error uploading file: File type required |
    | data     | 500         | Error uploading file: Data required      |

  Scenario: Send download file request without file name
    When send download file request without file name
    Then expected response status 500 and message "Error downloading file: File id required"

  Scenario: Download file that not exist
    When download file that not exist
    Then expected response status 404 and message "Error downloading file: File not found"
