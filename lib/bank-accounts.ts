export interface BankAccount {
  bankName: string
  accountHolder: string
  iban: string
  branch?: string
}

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    bankName: 'Ziraat Bankası',
    accountHolder: 'Mustafa Akdağ - Akdağ Elektronik',
    iban: 'TR00 0000 0000 0000 0000 0000 00', // Gerçek IBAN ile güncellenmeli
    branch: 'Melikgazi Şubesi'
  },
  {
    bankName: 'Garanti BBVA',
    accountHolder: 'Mustafa Akdağ - Akdağ Elektronik',
    iban: 'TR11 1111 1111 1111 1111 1111 11', // Gerçek IBAN ile güncellenmeli
    branch: 'Kayseri Merkez'
  }
]
