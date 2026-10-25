"""Authored vocabulary for synthetic password generation. Not derived from any breach."""

WORDS = """
password love dragon monkey sunshine princess football baseball cricket shadow master
welcome admin login secret freedom summer winter spring autumn flower cookie pepper
ginger hello superman batman spiderman ironman thunder tiger lion eagle falcon panther
angel heaven star moon galaxy rocket pirate ninja samurai wizard magic dream happy
lucky purple orange yellow silver golden diamond crystal pearl ruby cherry banana mango
apple coffee chocolate butter honey sugar candy pizza burger chicken cheese guitar music
piano rock metal jazz dance party money cash rich power king queen prince knight castle
soccer hockey tennis boxing racing ferrari porsche mustang bmw honda yamaha harley
matrix hacker gamer pokemon mario zelda minecraft fortnite warrior legend hero killer
hunter sniper soldier army navy pilot doctor teacher mother father family friend
buddy baby sweet cute pretty beautiful flowers rainbow sunset ocean river mountain
forest garden winter snow storm fire water earth wind light dark black white blue red
green india delhi mumbai dehradun bangalore london paris tokyo jordan michael charlie
thomas daniel jessica ashley jennifer andrew joshua matthew robert david james william
rahul priya amit neha rohit pooja vikas anjali arjun karan simran sneha aditya rohan
shiva ganesh krishna radha durga om sairam jaishriram welcome1 letmein trustno1 iloveyou
whatever nothing access computer internet google facebook instagram youtube netflix
mylove mybaby forever always together kiss heart soul spirit faith hope grace jesus
""".split()

KEYBOARD_WALKS = [
    "qwerty", "qwertyuiop", "asdf", "asdfgh", "asdfghjkl", "zxcvbn", "zxcvbnm", "qazwsx",
    "1qaz2wsx", "qweasd", "poiuy", "lkjhg", "mnbvc", "1q2w3e", "1q2w3e4r", "zaq12wsx",
]

SEQUENCES = [
    "123", "1234", "12345", "123456", "1234567", "12345678", "123456789", "1234567890",
    "abc", "abcd", "abcdef", "987654321", "111111", "000000", "121212", "654321", "112233",
]

SUFFIXES = ["", "1", "12", "123", "1234", "!", "@", "#", "007", "69", "99", "01", "2024", "2025", "2026", "@123", "#1", "!!"]

LEET = {"a": "4", "e": "3", "i": "1", "o": "0", "s": "5", "t": "7"}
LEET_SYMBOL = {"a": "@", "s": "$", "i": "!"}
